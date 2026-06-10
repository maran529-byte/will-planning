// MiniMax API Configuration
export const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';
export const MINIMAX_BASE_URL = 'https://api.minimaxi.com/anthropic';
export const MINIMAX_MODEL = 'MiniMax-M2.7';

// Supabase Configuration (placeholder - replace with real credentials)
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// WeChat Pay Configuration
// 改版 v2: 命名对齐 Vercel 已配的 WECHAT_MP_* 系列 (公众号登录在 src/lib/wechat/config.ts:11
// 已在用 WECHAT_MP_APP_ID). 旧名 (WECHAT_APPID/MCHID/API_KEY/NOTIFY_URL) 保留为 fallback
// 以防其他环境 (本地 .env.local) 仍按旧名配置. 未配齐 MCHID + API_V3_KEY 时,
// isWechatConfigured() 返回 false, 走 demo 通道 (payment.ts:64), 不影响功能.
export const WECHAT_APPID = process.env.WECHAT_MP_APP_ID || process.env.WECHAT_APPID || '';
export const WECHAT_MCHID = process.env.WECHAT_MP_MCHID || process.env.WECHAT_MCHID || '';
export const WECHAT_API_KEY = process.env.WECHAT_MP_API_V3_KEY || process.env.WECHAT_API_KEY || '';
export const WECHAT_NOTIFY_URL =
  process.env.WECHAT_NOTIFY_URL ||
  (process.env.SITE_URL ? `${process.env.SITE_URL.replace(/\/+$/, '')}/api/payment/callback` : '');

// Hupijiao (虎皮椒 / xunhupay) 个人微信聚合支付配置
// 改版 v4 (2026-06-08): MVP 上线主通道. 个人微信收款, 适合无营业执照的小团队.
// API 文档: https://www.xunhupay.com/doc/api/pay.html
// 签名: MD5(按 key 字母排序的非空参数 + app_secret)
// 未配齐 4 项时, isHupijiaoConfigured() 返回 false, 走 manual 通道 (二维码人工确认).
export const HUPIJIAO_APPID = process.env.HUPIJIAO_APPID || '';
export const HUPIJIAO_APP_SECRET = process.env.HUPIJIAO_APP_SECRET || '';
export const HUPIJIAO_GATEWAY_URL =
  process.env.HUPIJIAO_GATEWAY_URL || 'https://api.xunhupay.com/payment/do.html';
export const HUPIJIAO_NOTIFY_URL =
  process.env.HUPIJIAO_NOTIFY_URL ||
  (process.env.SITE_URL ? `${process.env.SITE_URL.replace(/\/+$/, '')}/api/payment/hupijiao-callback` : '');

// Pricing (UI display, in 元)
// 改版 v2: 删除 family 套餐, lawyer 改名为 expert (资产规划专业人士)
export const PRICING = {
  guide: { name: '智能版', price: 19.9, description: '问卷+生成草稿+PDF', promo: true, promoText: '限时优惠' },
  expertReview: { name: '专家护航版', price: 999, description: '系统化生成+资产规划专业人士审核+签署指引' },
} as const;

// 兼容旧 plan 字符串的显示名. UI 渲染订单/历史 plan 时使用。
export const PLAN_DISPLAY: Record<string, string> = {
  ai: PRICING.guide.name,
  expert: PRICING.expertReview.name,
  lawyer: PRICING.expertReview.name,   // 历史值 → 映射到 expert 显示
  family: '已下架',                    // 历史值 → 标注已下架
};

// 文书类型
export const DOCUMENT_TYPES = [
  { value: 'will', label: '遗嘱' },
  { value: 'gift', label: '赠与协议' },
  { value: 'trust', label: '家族信托' },
  { value: 'guardianship', label: '监护协议' },
] as const;

// Business Configuration
export const PLATFORM_FEE_RATIO = 0.4; // 40% platform, 60% lawyer
