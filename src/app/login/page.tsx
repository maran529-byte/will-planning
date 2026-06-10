/**
 * /login - 用户登录页
 *
 * 改版 v1 (2026-06-08, Phase B):
 *   - 邮箱+密码登录 (任意 role: user/blogger/lawyer/admin)
 *   - 博主也走这个入口 (审核通过后, 用注册时的邮箱密码登录)
 *   - ?return=/path 参数支持登录后跳回
 *   - ?registered=1 参数显示"注册成功, 请登录"提示
 *
 * 注意: 这是普通用户登录 (/admin/login 是管理员专用, 不要混用)
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from './LoginForm';
import { BrandLogo } from '@/components/BrandLogo';

export const metadata: Metadata = {
  title: '登录 | 爱的延续',
  description: '登录爱的延续, 管理您的文书草稿、订单与博主推广',
};

interface PageProps {
  searchParams: Promise<{ return?: string; registered?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const returnTo = params.return || '/dashboard';
  const justRegistered = params.registered === '1';

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* 顶部 logo */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-amber-600 transition"
          >
            <BrandLogo size="sm" />
          </Link>
        </div>

        {/* 登录卡片 */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2 leading-tight-cn">欢迎回来</h1>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed-cn">
            登录后可以管理您的草稿、订单和博主推广
          </p>

          {justRegistered && (
            <div
              className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg p-3 mb-5 leading-relaxed-cn"
              role="status"
            >
              <span aria-hidden>🎉 </span>注册成功, 请用刚注册的邮箱密码登录
            </div>
          )}

          <LoginForm returnTo={returnTo} />

          {/* 切换到注册 */}
          <div className="mt-6 pt-6 border-t border-slate-100 text-center text-sm text-slate-600">
            还没有账号?{' '}
            <Link
              href={`/register${returnTo ? `?return=${encodeURIComponent(returnTo)}` : ''}`}
              className="text-amber-600 hover:text-amber-700 font-semibold"
            >
              立即注册
            </Link>
          </div>
        </div>

        {/* 底部提示 */}
        <div className="mt-6 text-center text-xs text-slate-500 leading-relaxed-cn">
          <p>
            管理员请去{' '}
            <a href="/admin/login" className="text-slate-700 hover:text-amber-600 underline">管理员入口</a>
          </p>
          <p className="mt-2">
            登录即表示同意{' '}
            <a href="/terms" className="underline">服务条款</a> 与{' '}
            <a href="/privacy" className="underline">隐私政策</a>
          </p>
        </div>
      </div>
    </div>
  );
}
