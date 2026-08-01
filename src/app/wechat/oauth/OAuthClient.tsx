'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * /wechat/oauth - 微信 OAuth 跳转中转页
 *
 * 流程:
 *   1. 用户点登录弹窗按钮 → 跳 /wechat/oauth?state=PC_LOGIN&return=/orders
 *   2. 本页面调 /api/wechat/prepare-oauth 把 state + returnTo 写入 cookie
 *   3. 拼出真正的微信 authorize URL,window.location.href 跳过去
 *   4. 用户在微信里"同意登录"
 *   5. 微信回调 /wechat/callback?code=xxx&state=xxx (server side 完成登录)
 *   6. 跳到 /wechat/success 或 returnTo
 *
 * 兜底:如果 5 秒内没跳转,显示一个"点此手动跳转"的按钮,避免用户卡住
 */
export default function OAuthClient() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState<string | null>(null);

  useEffect(() => {
    const state = searchParams.get('state') || 'PC_LOGIN';
    const returnTo = searchParams.get('return') || '/orders';
    const wechatAppId = process.env.NEXT_PUBLIC_WECHAT_APP_ID || '';
    const redirectUri = `${window.location.origin}/wechat/callback`;

    const targetUrl =
      `https://open.weixin.qq.com/connect/oauth2/authorize` +
      `?appid=${encodeURIComponent(wechatAppId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=snsapi_userinfo` +
      `&state=${encodeURIComponent(state)}#wechat_redirect`;

    let cancelled = false;
    (async () => {
      try {
        setManualUrl(targetUrl);
        const res = await fetch('/api/wechat/prepare-oauth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state, returnTo }),
        });
        if (!res.ok) {
          throw new Error('prepare-oauth failed');
        }
        if (cancelled) return;
        window.location.href = targetUrl;
      } catch (e) {
        if (cancelled) return;
        setError(
          '网络异常, 请手动点击下方按钮完成授权',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-4" aria-hidden>🔐</div>
        <h1 className="text-xl font-bold text-slate-800 mb-2 leading-tight-cn">
          正在跳转微信授权
        </h1>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed-cn">
          即将打开微信, 请在微信中点击「允许」完成授权
        </p>

        {error && (
          <div
            className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-4 mb-4 leading-relaxed-cn"
            role="alert"
          >
            <span aria-hidden>⚠️ </span>{error}
          </div>
        )}

        {manualUrl && (
          <a
            href={manualUrl}
            className="inline-block bg-[#07C160] hover:bg-[#06B05A] text-white font-semibold px-6 py-3 rounded-xl transition"
          >
            <span aria-hidden>💬 </span>手动前往微信授权
          </a>
        )}

        <p className="text-xs text-slate-400 mt-6 leading-relaxed-cn">
          授权完成后会自动返回家有所爱
        </p>
      </div>
    </div>
  );
}
