/**
 * 微信公众号 OAuth 回调
 * POST /api/wechat/oauth-callback
 * GET  /api/wechat/oauth-callback?code=xxx&state=xxx&expectedState=xxx
 *
 * 流程:
 *   1. H5 端从 URL query 拿到 code + state
 *   2. 前端 POST 此端点, 传 { code, state, expectedState }
 *      (WeChat 浏览器无法 fetch /api/... 所以也支持 GET 重定向)
 *   3. 后端校验 state (CSRF), 换 token, 拉 userinfo
 *   4. upsert 到 Supabase public.users
 *   5. 返回 { user_id, openid, display_name, avatar }
 *
 * 注意: GET 支持是为了兼容 WeChat 内置浏览器 fetch 失败的情况
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { exchangeCode, getUserInfo } from '@/lib/wechat/oauth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { setOpenidCookie } from '@/lib/cookie';

// ---------- Schemas ----------

const QuerySchema = z.object({
  code: z.string().min(1).max(512),
  state: z.string().min(1).max(128),
  expectedState: z.string().min(1).max(128),
});

const RequestSchema = z.object({
  code: z.string().min(1).max(512),
  state: z.string().min(1).max(128),
  expectedState: z.string().min(1).max(128),
});

// ---------- Core handler (shared) ----------

async function handleOAuthCallback(params: { code: string; state: string; expectedState: string }) {
  const { code, state, expectedState } = params;

  // 1. CSRF 校验
  if (state !== expectedState) {
    return NextResponse.json({ error: 'invalid_state' }, { status: 403 });
  }

  // 2. code 换 token
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

  // 3. 拉 userinfo
  let userInfo = null;
  if (token.scope.includes('userinfo')) {
    try {
      userInfo = await getUserInfo(token.access_token, token.openid);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.warn('getUserInfo failed:', message);
    }
  }

  // 4. upsert 到 Supabase
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
    // 包含 emoji 等, 暂不存 display_name
  } else if (userInfo?.nickname) {
    upsertData.display_name = userInfo.nickname;
  }

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
    await supabaseAdmin
      .from('users')
      .update(upsertData)
      .eq('id', userId);
  }

  // 5. 写入 HTTP-only cookie
  await setOpenidCookie(token.openid);

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

// ---------- GET handler (WeChat browser fallback) ----------

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const expectedState = searchParams.get('expectedState');

  if (!code || !state || !expectedState) {
    return NextResponse.json(
      { error: 'missing_params', message: '缺少 code、state 或 expectedState 参数' },
      { status: 400 }
    );
  }

  const result = await handleOAuthCallback({ code, state, expectedState });

  // 如果失败，返回错误 JSON（浏览器会显示在当前页）
  if (result.status !== 200) {
    const body = await result.json();
    const msg = encodeURIComponent(body.message || '登录失败');
    return NextResponse.redirect(`/wechat/callback?result=error&message=${msg}`, 302);
  }

  // 成功：重定向到成功页（cookie 已在 handleOAuthCallback 中写入）
  // 浏览器会自动携带 cookie 访问 /wechat/success
  return NextResponse.redirect('/wechat/success?result=ok', 302);
}

// ---------- POST handler ----------

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

  return handleOAuthCallback({ code, state, expectedState });
}
