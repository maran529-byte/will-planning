/**
 * 微信 OAuth 服务端回调
 * 路径: GET /wechat/callback?code=xxx&state=xxx
 *
 * 完全服务端处理，Next.js Route Handler：
 *   1. 读 URL query: code, state
 *   2. 读 cookie: expectedState, returnTo
 *   3. CSRF 校验
 *   4. exchangeCode → getUserInfo → upsert Supabase
 *   5. 写入 wx_openid cookie
 *   6. 302 重定向到 /wechat/success
 *
 * 注意: 此文件是 route.ts 而非 page.tsx, 必须是 Route Handler 才能导出 GET.
 */
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, getUserInfo } from '@/lib/wechat/oauth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { setOpenidCookie, getOauthStateCookie, clearOauthStateCookie, getOpenidCookieOptions } from '@/lib/cookie';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 用真实 Host 头构造绝对 URL（nextjs 的 req.url 是内部地址 localhost:3001）
 * nginx 反代会传 Host: h5.aiwill-planner.cn, x-forwarded-proto: https
 */
function buildPublicUrl(req: NextRequest, path: string): URL {
  const host = req.headers.get('host') || 'h5.aiwill-planner.cn';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  return new URL(path, `${proto}://${host}`);
}

/**
 * 为已认证的 WeChat 用户签发 Supabase session, 使其能访问 /dashboard 等
 * 需要 user_session 的页面.
 *
 * 实现方式:
 *   1. 调 supabase.auth.admin.generateLink({ type: 'magiclink', email })
 *      → 返回 { properties: { email_otp, action_link, verification_type } }
 *   2. 用 anon 客户端调 auth.verifyOtp({ email, token: email_otp, type })
 *      → 返回 { data: { session, user } }
 *
 * 注: anon 客户端 (SUPABASE_ANON_KEY) 调 verifyOtp 不需要 service_role,
 *     这是 Supabase 标准 OAuth 链接流程.
 */
async function mintUserSessionForEmail(email: string): Promise<{
  access_token: string;
  expires_in: number;
} | null> {
  if (!supabaseAdmin) return null;
  // 1. 生成 magic link
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkError || !linkData?.properties?.email_otp) {
    console.warn('generateLink failed:', linkError?.message);
    return null;
  }
  // 2. 用 email_otp 兑换 session (anon 客户端即可, 不需要 service_role)
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const verifyType = (linkData.properties.verification_type || 'magiclink') as
    | 'magiclink' | 'signup' | 'email' | 'recovery';
  const { data: verifyData, error: verifyError } = await anon.auth.verifyOtp({
    email,
    token: linkData.properties.email_otp,
    type: verifyType,
  });
  if (verifyError || !verifyData?.session) {
    console.warn('verifyOtp failed:', verifyError?.message);
    return null;
  }
  return {
    access_token: verifyData.session.access_token,
    expires_in: verifyData.session.expires_in ?? 3600,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const { state: expectedState, returnTo } = await getOauthStateCookie();
  const finalReturnTo = returnTo || '/orders';

  await clearOauthStateCookie();

  if (!code || !state) {
    return NextResponse.redirect(
      buildPublicUrl(req, `/wechat/callback-error?message=${encodeURIComponent('微信回调缺少 code 或 state 参数')}`),
      302
    );
  }

  if (!expectedState) {
    return NextResponse.redirect(
      buildPublicUrl(req, `/wechat/callback-error?message=${encodeURIComponent('会话已过期，请重新发起登录')}`),
      302
    );
  }

  if (state !== expectedState) {
    return NextResponse.redirect(
      buildPublicUrl(req, `/wechat/callback-error?message=${encodeURIComponent('state 校验失败，请重新登录')}`),
      302
    );
  }

  let token;
  try {
    token = await exchangeCode(code);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.redirect(
      buildPublicUrl(req, `/wechat/callback-error?message=${encodeURIComponent('登录失败：' + message)}`),
      302
    );
  }

  let userInfo = null;
  if (token.scope && token.scope.includes('userinfo')) {
    try {
      userInfo = await getUserInfo(token.access_token, token.openid);
    } catch {
      // userinfo 拉失败不致命
    }
  }

  if (!supabaseAdmin) {
    return NextResponse.redirect(
      buildPublicUrl(req, `/wechat/callback-error?message=${encodeURIComponent('服务未配置，请稍后重试')}`),
      302
    );
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
    // 包含 emoji 不存 display_name
  } else if (userInfo?.nickname) {
    upsertData.display_name = userInfo.nickname;
  }

  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id, openid, display_name, wechat_avatar_url')
    .eq('openid', token.openid)
    .maybeSingle();

  let userId: string;
  let userEmail: string;
  if (existing) {
    userId = existing.id;
    userEmail = `wx_${token.openid}@aiwill.local`;
    await supabaseAdmin.from('users').update(upsertData).eq('id', userId);
  } else {
    userEmail = `wx_${token.openid}@aiwill.local`;
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      email_confirm: true,
      user_metadata: { source: 'wechat_oauth' },
    });
    if (authError || !authUser.user) {
      return NextResponse.redirect(
        buildPublicUrl(req, `/wechat/callback-error?message=${encodeURIComponent('创建账户失败，请稍后重试')}`),
        302
      );
    }
    userId = authUser.user.id;
    await supabaseAdmin.from('users').update(upsertData).eq('id', userId);
  }

  await setOpenidCookie(token.openid);

  // 同时签发 Supabase user_session, 让用户能访问 /dashboard 等需要 user_session 的页面.
  // 不影响 /orders 等只需 wx_openid 的页面.
  // (注意: cookies() store 在 Route Handler 中不会自动下发, 必须显式写到 response)
  let userSession: { access_token: string; expires_in: number } | null = null;
  try {
    userSession = await mintUserSessionForEmail(userEmail);
  } catch (e) {
    console.warn('mintUserSessionForEmail threw:', e);
  }

  // 关键修复: NextResponse.redirect() 创建的是新响应对象, Next.js cookies() store
  // 设置的 cookie 不会自动附加到此响应上. 必须用 response.cookies.set 显式写入,
  // 否则浏览器收不到 wx_openid, /orders 会误判未登录, 触发"请先登录→绑定→循环".
  const successRedirect = NextResponse.redirect(
    buildPublicUrl(req, `/wechat/success?result=ok&return=${encodeURIComponent(finalReturnTo)}`),
    302
  );
  successRedirect.cookies.set(getOpenidCookieOptions(token.openid));
  // 同时附加 user_session cookie (HttpOnly, base64(JSON{access_token, expires_at}))
  if (userSession) {
    const payload = JSON.stringify({
      access_token: userSession.access_token,
      expires_at: Date.now() + userSession.expires_in * 1000,
    });
    const encoded = Buffer.from(payload, 'utf-8').toString('base64');
    successRedirect.cookies.set({
      name: 'user_session',
      value: encoded,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24h, 与 setUserSessionCookie 一致
      path: '/',
    });
  }
  return successRedirect;
}
