/**
 * WeChat 配置健康检查 (公开 GET, 仅返回环境变量是否已配置, 不返回密钥值)
 *
 * URL: GET /api/wechat/health
 * 用途: Vercel 部署后, 用户可在浏览器直接打开此端点确认:
 *   - WECHAT_MP_APP_ID / WECHAT_MP_APP_SECRET 是否已设置
 *   - WECHAT_PROXY_URL 是否配置
 *
 * ⚠️ 安全: 仅返回布尔值 + AppID 前 4 位 (供辨识), 不返回密钥任何字符
 */

import { NextResponse } from 'next/server';
import {
  WECHAT_MP_APP_ID,
  WECHAT_MP_APP_SECRET,
  WECHAT_API_BASE,
  WECHAT_OAUTH_AUTHORIZE_URL,
  H5_BASE_URL,
  H5_OAUTH_REDIRECT_URI,
} from '@/lib/wechat/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const appIdPresent = Boolean(WECHAT_MP_APP_ID);
  const appSecretPresent = Boolean(WECHAT_MP_APP_SECRET);
  const proxyConfigured = process.env.WECHAT_PROXY_URL ? true : false;

  // AppID 前 4 + 后 2 (供辨识, 不会泄露完整 AppID)
  const appIdMasked = appIdPresent
    ? `${WECHAT_MP_APP_ID.slice(0, 4)}***${WECHAT_MP_APP_ID.slice(-2)}`
    : null;

  return NextResponse.json(
    {
      ok: appIdPresent && appSecretPresent,
      env: {
        WECHAT_MP_APP_ID: { set: appIdPresent, preview: appIdMasked },
        WECHAT_MP_APP_SECRET: { set: appSecretPresent },
        WECHAT_APPSECRET: {
          set: Boolean(process.env.WECHAT_APPSECRET),
          note: '兼容旧名, 优先取 WECHAT_MP_APP_SECRET',
        },
        WECHAT_PROXY_URL: { set: proxyConfigured },
      },
      endpoints: {
        WECHAT_API_BASE,
        WECHAT_OAUTH_AUTHORIZE_URL,
        H5_BASE_URL,
        H5_OAUTH_REDIRECT_URI,
      },
      hint: !appSecretPresent
        ? 'WECHAT_MP_APP_SECRET 未配置 → 微信登录会失败 41004 appsecret missing. ' +
          '请到 Vercel → Settings → Environment Variables 添加 WECHAT_MP_APP_SECRET, 然后 Redeploy.'
        : '配置正常, 可尝试微信登录',
    },
    { status: 200 }
  );
}