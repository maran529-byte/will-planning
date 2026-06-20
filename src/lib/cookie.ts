/**
 * Server-side cookie helpers (Next.js App Router).
 *
 * 当前用户身份: 通过 WeChat 公众号 OAuth 回调时, 服务端将 openid 写入
 * HTTP-only cookie (wx_openid). 后续所有"我的订单"类请求都基于此 cookie
 * 过滤, 避免之前"全站共享一份订单列表"的 bug.
 *
 * 安全要点:
 *  - HTTP-only: 阻止 XSS 窃取
 *  - SameSite=Lax: 防 CSRF
 *  - Secure (生产): 仅 HTTPS 传输
 *  - 1 年有效: 公众号关注关系通常不会变动
 */
import { cookies } from 'next/headers';

export const WX_OPENID_COOKIE = 'wx_openid';
export const WX_OAUTH_STATE_COOKIE = 'wx_oauth_state';
export const WX_OAUTH_RETURN_COOKIE = 'wx_oauth_return';

export async function getOpenidFromCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(WX_OPENID_COOKIE)?.value ?? null;
}

export async function setOpenidCookie(openid: string): Promise<void> {
  const store = await cookies();
  store.set(WX_OPENID_COOKIE, openid, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  });
}

/**
 * 返回 wx_openid 的 cookie 设置参数 (供 Route Handler 在 NextResponse 上手动 .cookies.set 使用).
 * Next.js cookies() store 修改只在同请求内, 经由响应对象携带才能下发到浏览器.
 * 在 Route Handler 中调用 setOpenidCookie 后, 再用 NextResponse.redirect 时,
 * cookie 必须通过 response.cookies.set() 显式附加, 否则浏览器收不到.
 */
export function getOpenidCookieOptions(openid: string) {
  return {
    name: WX_OPENID_COOKIE,
    value: openid,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  };
}

export async function clearOpenidCookie(): Promise<void> {
  const store = await cookies();
  store.delete(WX_OPENID_COOKIE);
}

/**
 * 写入微信 OAuth state 到 cookie（用于服务端 callback 校验 CSRF）
 * 短生命周期：5 分钟，与微信 code 有效期一致
 */
export async function setOauthStateCookie(state: string, returnTo: string): Promise<void> {
  const store = await cookies();
  store.set(WX_OAUTH_STATE_COOKIE, state, {
    httpOnly: false, // callback 服务端需要读取
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 5, // 5 分钟
    path: '/',
  });
  if (returnTo) {
    store.set(WX_OAUTH_RETURN_COOKIE, returnTo, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 5,
      path: '/',
    });
  }
}

export async function getOauthStateCookie(): Promise<{ state: string | null; returnTo: string | null }> {
  const store = await cookies();
  return {
    state: store.get(WX_OAUTH_STATE_COOKIE)?.value ?? null,
    returnTo: store.get(WX_OAUTH_RETURN_COOKIE)?.value ?? null,
  };
}

export async function clearOauthStateCookie(): Promise<void> {
  const store = await cookies();
  store.delete(WX_OAUTH_STATE_COOKIE);
  store.delete(WX_OAUTH_RETURN_COOKIE);
}
