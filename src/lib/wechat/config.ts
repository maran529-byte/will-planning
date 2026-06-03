/**
 * 微信公众号 (Subscription Account) 配置
 * @see docs/公众号配置清单.md
 * @see aiwill-planner_公众号集成架构_v1.md §11
 *
 * ⚠️ 安全: AppSecret 仅在 HK Vercel 后端 env 注入, 永不下发到前端
 * ⚠️ 之前的 AppSecret 已在聊天明文泄露, 务必在 mp.weixin.qq.com 重置
 */

// 公众号 (非认证订阅号) 凭证
export const WECHAT_MP_APP_ID = process.env.WECHAT_MP_APP_ID || 'wx30fe5cd917eb2e7a';
export const WECHAT_MP_APP_SECRET = process.env.WECHAT_MP_APP_SECRET || '';  // ⚠️ 重置后填入

// 公众号服务器配置 (URL 验证 + 消息加解密)
export const WECHAT_MP_TOKEN = process.env.WECHAT_MP_TOKEN || '';             // 32 位随机
export const WECHAT_MP_AES_KEY = process.env.WECHAT_MP_AES_KEY || '';         // 43 位随机 (明文模式可空)
export const WECHAT_MP_ENCODING = (process.env.WECHAT_MP_ENCODING || 'plain') as 'plain' | 'aes';

// H5 站点 (业务前端) - 用于 OAuth 回调 / 菜单跳转
export const H5_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://h5.aiwill-planner.cn';
export const H5_OAUTH_REDIRECT_URI = `${H5_BASE_URL}/wechat/callback`;

// 公众号 API 端点
export const WECHAT_API_BASE = 'https://api.weixin.qq.com';
export const WECHAT_OAUTH_AUTHORIZE_URL = `${WECHAT_API_BASE}/connect/oauth2/authorize`;

// 48h 客服消息窗口
export const CS_MESSAGE_WINDOW_HOURS = 48;

// 安全: AppSecret 不可读时的快速失败
export function assertWeChatMpConfigured(): void {
  if (!WECHAT_MP_APP_ID || !WECHAT_MP_APP_SECRET) {
    throw new Error(
      'WECHAT_MP_APP_ID / WECHAT_MP_APP_SECRET 未配置. ' +
      '请在 Vercel 环境变量配置, 然后 Redeploy.'
    );
  }
}
