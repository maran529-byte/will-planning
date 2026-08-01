/**
 * PC 端输入验证码完成登录
 * POST /api/wechat/pc-login-verify
 *
 * 改版 v13 (2026-06-29)
 *
 * Body: { ticket, code }
 * Response: { success: true, user: {...}, returnTo: '/orders' }
 *
 * 流程:
 *   1. PC 端拿到公众号推送的 8 位验证码
 *   2. 调本接口, 携带 ticket + code
 *   3. 后端校验: ticket 存在 + status=confirmed + code 匹配 + 未过期
 *   4. 通过则:
 *      - 标记 ticket=consumed
 *      - 用 openid 查 public.users → 拿到 user_id
 *      - 签发 user_session cookie (与微信 OAuth 走同一条逻辑)
 *      - 返回 returnTo 让前端跳转
 *
 * 安全:
 *   - code 验证仅 5 次机会 (防爆破)
 *   - 一次性消费, consumed 后 ticket 立即失效
 *   - 即使 ticket/code 泄露, 没有对应 openid cookie 关联的浏览器也无法登录
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_INTERNAL_URL, SUPABASE_ANON_KEY } from '@/lib/config';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getOpenidCookieOptions } from '@/lib/cookie';

const RequestSchema = z.object({
  ticket: z.string().min(8).max(64).optional(),
  code: z.string().length(8),
});

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { code: 'SUPABASE_NOT_CONFIGURED', error: 'Supabase 未配齐' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: 'INVALID_JSON', error: '请求格式错误' },
      { status: 400 }
    );
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'INVALID_REQUEST', error: 'ticket 或 code 格式错误' },
      { status: 400 }
    );
  }

  const { ticket, code } = parsed.data;
  const upperCode = code.toUpperCase();

  // 1. 查 ticket (按 ticket 优先, 否则按 code 查最新已确认的)
  //    改版 v13.1 (2026-06-30): 支持"先手机后电脑"场景, 此时 ticket 不存在, 按 code 反查
  let row: { ticket: string; code: string; openid: string | null; status: string; expires_at: string; return_to: string | null; attempts: number; max_attempts: number; user_id: string | null; confirmed_at: string | null; consumed_at: string | null } | null = null;
  let queryError: unknown = null;

  if (ticket) {
    const r = await supabaseAdmin
      .from('pc_login_tickets')
      .select('*')
      .eq('ticket', ticket)
      .maybeSingle();
    row = r.data as typeof row;
    queryError = r.error;
  } else {
    // 按 code 反查: 选未过期、status=confirmed、openid 已填的最新一条
    const r = await supabaseAdmin
      .from('pc_login_tickets')
      .select('*')
      .eq('code', upperCode)
      .eq('status', 'confirmed')
      .not('openid', 'is', null)
      .gt('expires_at', new Date().toISOString())
      .order('confirmed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    row = r.data as typeof row;
    queryError = r.error;
  }

  if (queryError) {
    console.error('[pc-login-verify] query failed:', queryError);
    return NextResponse.json(
      { code: 'QUERY_FAILED', error: '查询失败' },
      { status: 500 }
    );
  }

  if (!row) {
    return NextResponse.json(
      { code: 'TICKET_NOT_FOUND', error: '票据不存在或已过期, 请在公众号内回复【PC】重新获取验证码' },
      { status: 404 }
    );
  }

  // 2. 检查状态
  if (row.status === 'consumed') {
    return NextResponse.json(
      { code: 'TICKET_CONSUMED', error: '票据已使用' },
      { status: 410 }
    );
  }
  if (row.status === 'expired' || new Date(row.expires_at) < new Date()) {
    // 标记为 expired
    await supabaseAdmin
      .from('pc_login_tickets')
      .update({ status: 'expired' })
      .eq('ticket', row.ticket);
    return NextResponse.json(
      { code: 'TICKET_EXPIRED', error: '票据已过期,请重新扫码' },
      { status: 410 }
    );
  }
  if (row.status === 'cancelled') {
    return NextResponse.json(
      { code: 'TICKET_CANCELLED', error: '票据已取消' },
      { status: 410 }
    );
  }
  if (row.status === 'pending') {
    return NextResponse.json(
      {
        code: 'NOT_CONFIRMED',
        error: '请先在公众号内回复【PC】获取验证码',
      },
      { status: 400 }
    );
  }

  // 3. 检查 attempts 防爆破
  if (row.attempts >= row.max_attempts) {
    await supabaseAdmin
      .from('pc_login_tickets')
      .update({ status: 'cancelled' })
      .eq('ticket', row.ticket);
    return NextResponse.json(
      { code: 'TOO_MANY_ATTEMPTS', error: '尝试次数过多,请重新扫码' },
      { status: 429 }
    );
  }

  // 4. 校验 code
  if (row.code !== upperCode) {
    await supabaseAdmin
      .from('pc_login_tickets')
      .update({ attempts: row.attempts + 1 })
      .eq('ticket', row.ticket);
    const remaining = row.max_attempts - row.attempts - 1;
    return NextResponse.json(
      {
        code: 'CODE_MISMATCH',
        error: `验证码错误,还剩 ${remaining} 次机会`,
        remaining,
      },
      { status: 400 }
    );
  }

  // 5. code 匹配, 查 user
  const { data: userRow, error: userQueryError } = await supabaseAdmin
    .from('users')
    .select('id, email, openid, display_name, wechat_nickname, wechat_avatar_url')
    .eq('openid', row.openid)
    .maybeSingle();

  if (userQueryError) {
    console.error('[pc-login-verify] user query failed:', userQueryError);
    return NextResponse.json(
      { code: 'USER_QUERY_FAILED', error: '查询用户失败' },
      { status: 500 }
    );
  }

  let userId: string;
  let userEmail: string;
  if (userRow) {
    userId = userRow.id;
    userEmail = userRow.email || `wx_${row.openid}@aiwill.local`;
  } else {
    // 公众号内确认时还没建 user 记录(罕见), 此处兜底创建
    const tempEmail = `wx_${row.openid}@aiwill.local`;
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: tempEmail,
      email_confirm: true,
      user_metadata: { source: 'pc_login_ticket' },
    });
    if (authError || !authUser.user) {
      return NextResponse.json(
        { code: 'AUTH_CREATE_FAILED', error: authError?.message || '用户创建失败' },
        { status: 500 }
      );
    }
    userId = authUser.user.id;
    userEmail = tempEmail;
    await supabaseAdmin
      .from('users')
      .update({
        openid: row.openid,
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  }

  // 6. 签发 user_session cookie (复用 oauth-callback 的 magiclink → verifyOtp 流程)
  let userSession: { access_token: string; expires_in: number } | null = null;
  try {
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
    });
    if (!linkError && linkData?.properties?.email_otp) {
      const anon = createClient(SUPABASE_INTERNAL_URL, SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const verifyType = (linkData.properties.verification_type || 'magiclink') as
        | 'magiclink' | 'signup' | 'email' | 'recovery';
      const { data: verifyData, error: verifyError } = await anon.auth.verifyOtp({
        email: userEmail,
        token: linkData.properties.email_otp,
        type: verifyType,
      });
      if (!verifyError && verifyData?.session) {
        userSession = {
          access_token: verifyData.session.access_token,
          expires_in: verifyData.session.expires_in ?? 3600,
        };
      }
    }
  } catch (e) {
    console.warn('[pc-login-verify] mintUserSessionForEmail threw:', e);
  }

  if (!userSession) {
    return NextResponse.json(
      { code: 'SESSION_MINT_FAILED', error: '签发 session 失败' },
      { status: 500 }
    );
  }

  // 7. 标记 ticket=consumed
  await supabaseAdmin
    .from('pc_login_tickets')
    .update({
      status: 'consumed',
      user_id: userId,
      consumed_at: new Date().toISOString(),
    })
    .eq('ticket', row.ticket);

  // 8. 写 cookie: wx_openid + user_session
  const expiresAt = Date.now() + userSession.expires_in * 1000;
  const sessionPayload = JSON.stringify({
    access_token: userSession.access_token,
    expires_at: expiresAt,
  });
  const encoded = Buffer.from(sessionPayload, 'utf-8').toString('base64');

  const response = NextResponse.json({
    success: true,
    user: {
      id: userId,
      email: userEmail,
      displayName: userRow?.display_name || userRow?.wechat_nickname || null,
      avatarUrl: userRow?.wechat_avatar_url || null,
    },
    returnTo: row.return_to || '/orders',
  });
  response.cookies.set(getOpenidCookieOptions(row.openid));
  response.cookies.set({
    name: 'user_session',
    value: encoded,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24,
    path: '/',
  });
  return response;
}
