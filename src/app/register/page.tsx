/**
 * /register - 用户注册页
 *
 * 改版 v1 (2026-06-08, Phase B):
 *   - 邮箱+密码+昵称 (可选) 注册
 *   - 必须勾选服务条款
 *   - 注册成功后跳 /login?registered=1 (不自动登录, 等用户确认邮箱)
 *
 * 设计:
 *   - 必填项用 zod 强校验 (前端 + 后端)
 *   - 真实环境会发确认邮件, Supabase 默认行为
 *   - 公开注册, 任何人都能成为 user (博主需另外申请)
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { RegisterForm } from './RegisterForm';

export const metadata: Metadata = {
  title: '注册 | 爱的延续',
  description: '免费注册爱的延续账号, 开始管理您的法律文书',
};

interface PageProps {
  searchParams: Promise<{ return?: string }>;
}

export default async function RegisterPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const returnTo = params.return || '/login?registered=1';

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-amber-600 transition"
          >
            <span className="text-2xl">⚖️</span>
            <span className="text-lg font-semibold">爱的延续</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">创建您的账号</h1>
          <p className="text-sm text-slate-500 mb-6">
            几秒钟即可完成, 立即管理您的法律文书
          </p>

          <RegisterForm returnTo={returnTo} />

          <div className="mt-6 pt-6 border-t border-slate-100 text-center text-sm text-slate-600">
            已有账号?{' '}
            <Link
              href={`/login${returnTo ? `?return=${encodeURIComponent(returnTo.replace('/login?registered=1', '/dashboard'))}` : ''}`}
              className="text-amber-600 hover:text-amber-700 font-semibold"
            >
              立即登录
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          <p>
            管理员请去 <a href="/admin/login" className="text-slate-700 hover:text-amber-600 underline">管理员入口</a>
          </p>
        </div>
      </div>
    </div>
  );
}
