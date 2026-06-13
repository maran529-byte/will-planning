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
import Link from 'next/link';

function WechatCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    // 检查是否是 API 重定向回来的结果
    const result = searchParams.get('result');
    const message = searchParams.get('message');

    if (result === 'ok') {
      // 来自 API 重定向的成功
      sessionStorage.removeItem('wechat_oauth_state');
      const returnTo = sessionStorage.getItem('wechat_oauth_return') || '/orders';
      sessionStorage.removeItem('wechat_oauth_return');
      setStatus('success');
      setTimeout(() => {
        router.push(`/wechat/success?return=${encodeURIComponent(returnTo)}`);
      }, 600);
      return;
    }

    if (result === 'error') {
      setStatus('error');
      setErrorMsg(decodeURIComponent(message || '登录失败'));
      return;
    }

    // 正常流程：直接从 URL 参数读取 code/state
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const expectedState = sessionStorage.getItem('wechat_oauth_state');

    if (!code || !state) {
      // 在 effect 里同步 setState 会触发 cascading render,
      // 用 microtask 推迟到 effect 结束之后
      Promise.resolve().then(() => {
        setStatus('error');
        setErrorMsg('微信回调缺少 code 或 state 参数');
      });
      return;
    }

    if (!expectedState) {
      Promise.resolve().then(() => {
        setStatus('error');
        setErrorMsg('会话已过期,请重新发起登录');
      });
      return;
    }

    if (state !== expectedState) {
      Promise.resolve().then(() => {
        setStatus('error');
        setErrorMsg('state 校验失败,可能存在 CSRF 攻击');
      });
      return;
    }

    // 调后端兑换
    // 注意: WeChat 内置浏览器无法 fetch /api/... (network error)，
    // 所以改用 window.location.href GET 重定向，浏览器直接导航到 API
    // API 处理完后 302 重定向到 /wechat/success?result=...
    (() => {
      const apiUrl = `/api/wechat/oauth-callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}&expectedState=${encodeURIComponent(expectedState)}`;
      window.location.href = apiUrl;
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
            <Link
              href="/wechat/bind"
              className="flex-1 rounded-lg bg-[#07C160] py-2 text-sm font-medium text-white hover:bg-[#06B05A]"
            >
              重新绑定
            </Link>
            <Link
              href="/"
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              返回首页
            </Link>
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
