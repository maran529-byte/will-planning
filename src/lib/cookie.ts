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

export async function clearOpenidCookie(): Promise<void> {
  const store = await cookies();
  store.delete(WX_OPENID_COOKIE);
}
