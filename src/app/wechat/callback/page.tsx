'use client';

/**
 * 微信 OAuth 客户端回调页
 * 路径: /wechat/callback
 *
 * 流程 (用户感知):
 *   1. 微信浏览器跳到 ?code=xxx&state=xxx&scope=snsapi_userinfo
 *   2. 此页加载, 显示"正在登录..."
 *   3. POST /api/wechat/oauth-callback { code, state, expectedState }
 *   4. 成功: 写 cookie, 跳 /wechat/success
 *   5. 失败: 显示错误
 *
 * 注意: 实际 code→token 兑换在 HK Vercel 后端 (api/wechat/oauth-callback)
 *       此页只负责: 校验 state + 转发 code + 跳成功页
 *
 * Next.js 16 要求: useSearchParams() 必须包在 <Suspense> 边界内
 */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function WechatCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const scope = searchParams.get('scope') || 'snsapi_userinfo';
    const expectedState = sessionStorage.getItem('wechat_oauth_state');

    if (!code || !state) {
      setStatus('error');
      setErrorMsg('微信回调缺少 code 或 state 参数');
      return;
    }

    if (!expectedState) {
      setStatus('error');
      setErrorMsg('会话已过期,请重新发起登录');
      return;
    }

    if (state !== expectedState) {
      setStatus('error');
      setErrorMsg('state 校验失败,可能存在 CSRF 攻击');
      return;
    }

    // 调后端兑换
    (async () => {
      try {
        const res = await fetch('/api/wechat/oauth-callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state, expectedState }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        // 清理 state
        sessionStorage.removeItem('wechat_oauth_state');

        // 跳成功页
        const returnTo = sessionStorage.getItem('wechat_oauth_return') || '/orders';
        sessionStorage.removeItem('wechat_oauth_return');

        setStatus('success');
        // 短暂展示成功态
        setTimeout(() => {
          router.push(`/wechat/success?return=${encodeURIComponent(returnTo)}`);
        }, 600);
      } catch (e: any) {
        setStatus('error');
        setErrorMsg(e.message || '登录失败,请重试');
      }
    })();
  }, [searchParams, router]);

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
      {status === 'processing' && (
        <>
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#07C160] border-t-transparent" />
          <h1 className="text-lg font-medium text-gray-900">正在登录…</h1>
          <p className="mt-2 text-sm text-gray-500">请稍候,正在与微信服务器通信</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#07C160]/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#07C160">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>
          <h1 className="text-lg font-medium text-gray-900">登录成功</h1>
          <p className="mt-2 text-sm text-gray-500">正在跳转…</p>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#EF4444">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
            </svg>
          </div>
          <h1 className="text-lg font-medium text-gray-900">登录失败</h1>
          <p className="mt-2 text-sm text-red-600">{errorMsg}</p>
          <div className="mt-6 flex gap-2">
            <a
              href="/wechat/bind"
              className="flex-1 rounded-lg bg-[#07C160] py-2 text-sm font-medium text-white hover:bg-[#06B05A]"
            >
              重新绑定
            </a>
            <a
              href="/"
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              返回首页
            </a>
          </div>
        </>
      )}
    </div>
  );
}

function CallbackFallback() {
  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#07C160] border-t-transparent" />
      <h1 className="text-lg font-medium text-gray-900">正在加载…</h1>
    </div>
  );
}

export default function WechatCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f5f7fa] to-white px-4">
      <Suspense fallback={<CallbackFallback />}>
        <WechatCallbackInner />
      </Suspense>
    </main>
  );
}
