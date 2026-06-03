/**
 * 微信公众号网页授权 (OAuth 2.0)
 * @see https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/Wechat_webpage_authorization.html
 *
 * 流程:
 *   1. H5 跳转 buildAuthorizeUrl() -> 用户授权
 *   2. 微信回调 /wechat/callback?code=xxx
 *   3. 后端 exchangeCode() 拿 access_token + openid
 *   4. (可选) getUserInfo() 拿昵称头像
 */

import {
  WECHAT_MP_APP_ID,
  WECHAT_MP_APP_SECRET,
  WECHAT_OAUTH_AUTHORIZE_URL,
  WECHAT_API_BASE,
  H5_OAUTH_REDIRECT_URI,
} from './config';

// ============================================================================
// Types
// ============================================================================

export type OAuthScope = 'snsapi_base' | 'snsapi_userinfo';

export interface AccessTokenResponse {
  access_token: string;
  expires_in: number;     // 秒
  refresh_token: string;
  openid: string;
  scope: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

export interface UserInfoResponse {
  openid: string;
  nickname: string;
  sex: 0 | 1 | 2;        // 0=未知, 1=男, 2=女
  province: string;
  city: string;
  country: string;
  headimgurl: string;
  privilege: string[];
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

// ============================================================================
// URL 构造
// ============================================================================

/**
 * 构造用户授权 URL
 * H5 端通过 window.location.href 跳转
 */
export function buildAuthorizeUrl(opts: {
  redirectUri?: string;
  scope?: OAuthScope;
  state: string;            // 防 CSRF, 需 H5 端生成并校验
}): string {
  const params = new URLSearchParams({
    appid: WECHAT_MP_APP_ID,
    redirect_uri: opts.redirectUri || H5_OAUTH_REDIRECT_URI,
    response_type: 'code',
    scope: opts.scope || 'snsapi_userinfo',
    state: opts.state,
  });
  return `${WECHAT_OAUTH_AUTHORIZE_URL}?${params.toString()}#wechat_redirect`;
}

// ============================================================================
// API 调用
// ============================================================================

/**
 * 用 code 换 access_token + openid
 * @throws Error 微信返回 errcode !== 0 时
 */
export async function exchangeCode(code: string): Promise<AccessTokenResponse> {
  const url = new URL(`${WECHAT_API_BASE}/sns/oauth2/access_token`);
  url.searchParams.set('appid', WECHAT_MP_APP_ID);
  url.searchParams.set('secret', WECHAT_MP_APP_SECRET);
  url.searchParams.set('code', code);
  url.searchParams.set('grant_type', 'authorization_code');

  const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`exchangeCode HTTP ${res.status}`);
  }
  const data = (await res.json()) as AccessTokenResponse;
  if (data.errcode && data.errcode !== 0) {
    throw new Error(`exchangeCode failed: ${data.errcode} ${data.errmsg}`);
  }
  return data;
}

/**
 * 拉用户信息 (snsapi_userinfo 流程需要)
 * 注意: 此处 access_token 是网页授权 token, 不是公众号 access_token
 */
export async function getUserInfo(
  accessToken: string,
  openid: string,
  lang: 'zh_CN' | 'zh_TW' | 'en' = 'zh_CN'
): Promise<UserInfoResponse> {
  const url = new URL(`${WECHAT_API_BASE}/sns/userinfo`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('openid', openid);
  url.searchParams.set('lang', lang);

  const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`getUserInfo HTTP ${res.status}`);
  }
  const data = (await res.json()) as UserInfoResponse;
  if (data.errcode && data.errcode !== 0) {
    throw new Error(`getUserInfo failed: ${data.errcode} ${data.errmsg}`);
  }
  return data;
}

/**
 * 刷新 access_token (用于长会话)
 */
export async function refreshAccessToken(refreshToken: string): Promise<AccessTokenResponse> {
  const url = new URL(`${WECHAT_API_BASE}/sns/oauth2/refresh_token`);
  url.searchParams.set('appid', WECHAT_MP_APP_ID);
  url.searchParams.set('grant_type', 'refresh_token');
  url.searchParams.set('refresh_token', refreshToken);

  const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`refreshAccessToken HTTP ${res.status}`);
  }
  return res.json() as Promise<AccessTokenResponse>;
}

// ============================================================================
// 工具
// ============================================================================

/**
 * 生成 CSRF state token (H5 端)
 * 应存入 sessionStorage, 回调时比对
 */
export function generateOAuthState(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}
