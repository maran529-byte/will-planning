// MiniMax API Configuration
export const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';
export const MINIMAX_BASE_URL = 'https://api.minimaxi.com/anthropic';
export const MINIMAX_MODEL = 'MiniMax-M2.7';

// Supabase Configuration (placeholder - replace with real credentials)
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// WeChat Pay Configuration
export const WECHAT_APPID = process.env.WECHAT_APPID || '';
export const WECHAT_MCHID = process.env.WECHAT_MCHID || '';
export const WECHAT_API_KEY = process.env.WECHAT_API_KEY || '';
export const WECHAT_NOTIFY_URL = process.env.WECHAT_NOTIFY_URL || '';

// Pricing
export const PRICING = {
  aiGuide: { name: 'AI专属版', price: 19.9, description: '问卷+生成草稿+PDF', promo: true, promoText: '限时优惠' },
  lawyerReview: { name: '律师护航版', price: 999, description: 'AI生成+律师视频审核+签署指引' },
  familyHeritage: { name: '家庭年度版', price: 4699, description: '全家族规划+年度律师顾问', perTime: true },
} as const;

// 文书类型
export const DOCUMENT_TYPES = [
  { value: 'will', label: '遗嘱' },
  { value: 'gift', label: '赠与协议' },
  { value: 'trust', label: '家族信托' },
  { value: 'guardianship', label: '监护协议' },
] as const;

// Business Configuration
export const PLATFORM_FEE_RATIO = 0.4; // 40% platform, 60% lawyer
