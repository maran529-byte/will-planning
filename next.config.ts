import type { NextConfig } from "next";

// P0 安全响应头: 在 Vercel (H5 部署) 端给所有页面加安全头.
// 之前只在 mainland-server nginx 加, 现在 H5 全局生效.
// 参考: OWASP Secure Headers Project + 公安部网安备案合规要求
const SECURITY_HEADERS = [
  // 防 clickjacking: 不允许任何域 iframe 我们
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // 防 MIME 嗅探: 浏览器必须按 Content-Type 解释资源
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referrer 策略: 跨站时只发 origin, 不带完整 URL
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 浏览器特性: 禁用摄像头/麦克风/支付/USB 等敏感 API (我们用不到)
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // HSTS: 强制 HTTPS 1 年 (Vercel 已经在 HTTPS 上, 加这层让客户端记住)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // CSP: 默认只信任同源 + Vercel + 微信 + 虎皮椒.
  // 不开 unsafe-eval (Next.js prod 模式不需要), 留 unsafe-inline for 内联 style.
  // 注意: 不加 frame-ancestors, 我们用 X-Frame-Options (兼容性更好).
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://*.vercel.com https://*.weixin.qq.com https://res.wx.qq.com https://*.xunhupay.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://*.vercel.com https://*.xunhupay.com https://*.weixin.qq.com https://api.minimax.chat wss://*.supabase.co",
      "frame-src 'self' https://*.weixin.qq.com",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        // 全站: API + 页面 都加
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
