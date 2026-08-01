/**
 * 微信公众号 (Service Account / 已认证订阅号) 配置
 * @see docs/公众号配置清单.md
 *
 * ⚠️ 安全: AppSecret 仅在 Vercel env 注入, 永不下发到前端
 */

// 公众号 凭证
export const WECHAT_MP_APP_ID = process.env.WECHAT_MP_APP_ID || process.env.WECHAT_APPID || 'wx77780599aa2a53ee';
// 兼容旧名 WECHAT_APPSECRET (支付模块用的命名), 优先取 WECHAT_MP_APP_SECRET
export const WECHAT_MP_APP_SECRET = process.env.WECHAT_MP_APP_SECRET || process.env.WECHAT_APPSECRET || '';

// 公众号服务器配置 (URL 验证 + 消息加解密)
export const WECHAT_MP_TOKEN = process.env.WECHAT_MP_TOKEN || '';             // 32 位随机
export const WECHAT_MP_AES_KEY = process.env.WECHAT_MP_AES_KEY || '';         // 43 位随机 (明文模式可空)
export const WECHAT_MP_ENCODING = (process.env.WECHAT_MP_ENCODING || 'plain') as 'plain' | 'aes';

// H5 站点 (业务前端) - 用于 OAuth 回调 / 菜单跳转
export const H5_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://h5.aiwill-planner.cn';
export const H5_OAUTH_REDIRECT_URI = `${H5_BASE_URL}/wechat/callback`;

// 公众号 API 端点
// Vercel Serverless 没有固定出口 IP, 微信 Open API 会对非白名单 IP 返回 40164.
// 通过 WECHAT_PROXY_URL (HK CVM 反代: 43.129.207.154:80) 中转, 让所有 Vercel→WeChat 请求
// 都从固定 IP 43.129.207.154 出口, 只需在 mp.weixin.qq.com 白名单加这一个 IP.
// 注: 之前用 9443 高端口, 腾讯云防火墙默认不放行; 已迁回 80 端口.
// ⚠️ 当前账号 wx30fe5cd917eb2e7a 是「订阅号」, 48001 api unauthorized —
//    订阅号不支持自定义菜单 / 用户管理 / 客服消息等写 API.
//    生产必须升级「服务号」(需营业执照 + ¥300/年认证), 或先用微信测试号开发.
export const WECHAT_API_BASE = (process.env.WECHAT_PROXY_URL?.replace(/\/$/, '') ||
  'https://api.weixin.qq.com') as string;
// OAuth 授权 URL 由浏览器直接打开, 不走后端, 必须保持官方域名
// open.weixin.qq.com 是用户端授权入口（浏览器可见），api.weixin.qq.com 是服务端 API（浏览器访问白屏）
export const WECHAT_OAUTH_AUTHORIZE_URL = 'https://open.weixin.qq.com/connect/oauth2/authorize';

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
