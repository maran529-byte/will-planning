/**
 * 分享注册 (2026-07-24 · 业务铁律 v1.0)
 *
 * A 分享链接 → B 注册 → A 立即得 ¥2 红包
 * 分享链接格式: https://h5.aiwill-planner.cn/register?ref=<user_id>
 */

export const REFERRAL_REWARD_CENTS = 200;  // 固定 ¥2
export const REFERRAL_PARAM = 'ref';
export const REFERRAL_STORAGE_KEY = 'aiwill_ref_code';

export interface ReferralLinkParams {
  baseUrl?: string;
  userId: string;
  channel?: 'wechat' | 'link' | 'qrcode' | 'other';
}

/**
 * 生成分享链接
 */
export function buildReferralLink(params: ReferralLinkParams): string {
  const base = params.baseUrl || 'https://h5.aiwill-planner.cn/register';
  const url = new URL(base);
  url.searchParams.set(REFERRAL_PARAM, params.userId);
  if (params.channel && params.channel !== 'link') {
    url.searchParams.set('channel', params.channel);
  }
  return url.toString();
}

/**
 * 解析注册 URL 的 ref 参数
 */
export function parseReferrerId(searchParams: URLSearchParams | string): string | null {
  const sp = typeof searchParams === 'string'
    ? new URLSearchParams(searchParams)
    : searchParams;
  return sp.get(REFERRAL_PARAM);
}

/**
 * 防自邀: referrer !== referee
 */
export function canBindReferral(referrerId: string, refereeId: string): boolean {
  return referrerId !== refereeId && !!referrerId && !!refereeId;
}

/**
 * 文案: 分享有礼
 */
export const REFERRAL_PROMO_TEXT = `🎁 邀请好友, 各得 ¥2 红包

您分享 → 好友通过您的链接注册 → 您立即获得 ¥2 红包 (好友不获得)
红包自动到账, 可在订单结算时使用 (最高抵 50% 订单金额)
30 天有效, 过期作废`;
