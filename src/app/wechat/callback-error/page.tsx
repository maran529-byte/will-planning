'use client';

/**
 * 微信 OAuth 回调错误页
 * 路径: /wechat/callback-error
 *
 * 注意：实际的 OAuth 逻辑（code 换 token、写 cookie）由 /wechat/callback
 * 的 route.ts (Route Handler) 处理。Route Handler 在 302 跳转到
 * /wechat/success?return=... 之前，如果出错会跳转到本页面。
 *
 * 错误码和 message 由 route.ts 拼接, 此处仅渲染。
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function CallbackInner() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message') || '登录失败，请重试';

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f5f7fa] to-white px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-lg font-medium text-gray-900">登录失败</h1>
        <p className="mt-2 text-sm text-gray-500 break-all">{message}</p>
        <div className="mt-6 space-y-2">
          <Link
            href="/login"
            className="block w-full rounded-lg bg-[#07C160] py-3 font-medium text-white hover:bg-[#06B05A]"
          >
            返回重新登录
          </Link>
          <Link
            href="/"
            className="block w-full rounded-lg border border-gray-300 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            返回首页
          </Link>
        </div>
      </div>
    </main>
  );
}

function CallbackFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f5f7fa] to-white px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#07C160] border-t-transparent" />
        <h1 className="text-lg font-medium text-gray-900">正在登录…</h1>
        <p className="mt-2 text-sm text-gray-500">请稍候</p>
      </div>
    </main>
  );
}

export default function WechatCallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <CallbackInner />
    </Suspense>
  );
}
