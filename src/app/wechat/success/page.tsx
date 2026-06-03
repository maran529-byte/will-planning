'use client';

/**
 * 绑定成功页
 * 路径: /wechat/success
 *
 * 用途:
 *   - 显示"绑定成功"
 *   - 自动跳回用户原本想去的页面 (默认 /orders)
 *   - 提供"返回公众号"和"继续浏览网站"两个选项
 */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function WechatSuccessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('return') || '/orders';
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          router.push(returnTo);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [returnTo, router]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f5f7fa] to-white px-4 py-8">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#07C160]/10">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="#07C160">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">绑定成功 🎉</h1>
        <p className="mt-2 text-sm text-gray-500">
          您已成功将公众号与网站账号关联
        </p>

        <div className="mt-8 space-y-3">
          <a
            href={returnTo}
            className="block w-full rounded-lg bg-[#07C160] py-3 font-medium text-white hover:bg-[#06B05A]"
          >
            继续浏览 ({countdown}s)
          </a>
          <Link
            href="/"
            className="block w-full rounded-lg border border-gray-300 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            返回首页
          </Link>
        </div>

        <div className="mt-10 rounded-xl bg-white p-6 text-left shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-gray-700">接下来您可以:</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <Dot />
              <span>在公众号菜单 <strong>我的账户 → 我的订单</strong> 查看订单</span>
            </li>
            <li className="flex items-start gap-2">
              <Dot />
              <span>在公众号回复 <strong>【订单】</strong> / <strong>【价格】</strong> 获取快捷帮助</span>
            </li>
            <li className="flex items-start gap-2">
              <Dot />
              <span>如需帮助,工作时间 9:00-21:00 回复 <strong>【人工】</strong></span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}

function Dot() {
  return (
    <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#07C160]" />
  );
}

function SuccessFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f5f7fa] to-white px-4 py-8">
      <div className="text-sm text-gray-500">正在加载…</div>
    </main>
  );
}

export default function WechatSuccessPage() {
  return (
    <Suspense fallback={<SuccessFallback />}>
      <WechatSuccessInner />
    </Suspense>
  );
}
