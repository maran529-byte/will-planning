/**
 * 微信公众号 OAuth 回调
 * POST /api/wechat/oauth-callback
 *
 * 流程:
 *   1. H5 端从 URL query 拿到 code + state
 *   2. H5 POST 此端点, 传 { code, state, expectedState }
 *   3. 后端校验 state (CSRF), 换 token, 拉 userinfo
 *   4. upsert 到 Supabase public.users
 *   5. 返回 { user_id, openid, display_name, avatar }
 *
 * 路由不应被前端直接 GET 触发, 必须是 POST
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { exchangeCode, getUserInfo } from '@/lib/wechat/oauth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { setOpenidCookie } from '@/lib/cookie';

// ---------- Schemas ----------

const RequestSchema = z.object({
  code: z.string().min(1).max(512),
  state: z.string().min(1).max(128),
  expectedState: z.string().min(1).max(128),
});

// ---------- Handler ----------

export async function POST(req: NextRequest) {
  // 1. 解析 body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { code, state, expectedState } = parsed.data;

  // 2. CSRF 校验
  if (state !== expectedState) {
    return NextResponse.json({ error: 'invalid_state' }, { status: 403 });
  }

  // 3. code 换 token
  let token;
  try {
    token = await exchangeCode(code);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: 'exchange_failed', message },
      { status: 502 }
    );
  }

  // 4. 拉 userinfo (snsapi_userinfo 才有 token.scope 包含 userinfo)
  let userInfo = null;
  if (token.scope.includes('userinfo')) {
    try {
      userInfo = await getUserInfo(token.access_token, token.openid);
    } catch (e: unknown) {
      // userinfo 拉失败不致命, openid 已够
      const message = e instanceof Error ? e.message : String(e);
      console.warn('getUserInfo failed:', message);
    }
  }

  // 6. upsert 到 Supabase
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'supabase_not_configured' }, { status: 503 });
  }

  const upsertData: Record<string, unknown> = {
    openid: token.openid,
    unionid: token.unionid ?? userInfo?.unionid ?? null,
    wechat_nickname: userInfo?.nickname ?? null,
    wechat_avatar_url: userInfo?.headimgurl ?? null,
    last_login_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (userInfo?.nickname && !userInfo.nickname.match(/^[\u4e00-\u9fa5\w\s]+$/)) {
    // 包含 emoji 等, 暂不存 display_name, 让用户手动设置
  } else if (userInfo?.nickname) {
    upsertData.display_name = userInfo.nickname;
  }

  // 7. 用 auth.users 关联: 先查是否已有同 openid 的 user
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id, openid, display_name, wechat_avatar_url')
    .eq('openid', token.openid)
    .maybeSingle();

  let userId: string;
  if (existing) {
    userId = existing.id;
    await supabaseAdmin
      .from('users')
      .update(upsertData)
      .eq('id', userId);
  } else {
    // 创建新 auth.users (用 admin API)
    const tempEmail = `wx_${token.openid}@aiwill.local`;
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: tempEmail,
      email_confirm: true,
      user_metadata: { source: 'wechat_oauth' },
    });
    if (authError || !authUser.user) {
      return NextResponse.json(
        { error: 'auth_create_failed', message: authError?.message },
        { status: 500 }
      );
    }
    userId = authUser.user.id;
    // handle_new_user 触发器会自动创建 public.users, 我们再 update
    await supabaseAdmin
      .from('users')
      .update(upsertData)
      .eq('id', userId);
  }

  // 8. 写入 HTTP-only cookie (关键:让后续请求能识别用户)
  await setOpenidCookie(token.openid);

  // 9. 读最新行
  const { data: finalUser } = await supabaseAdmin
    .from('users')
    .select('id, openid, display_name, wechat_nickname, wechat_avatar_url')
    .eq('id', userId)
    .single();

  return NextResponse.json({
    user: finalUser,
    scope: token.scope,
  });
}
