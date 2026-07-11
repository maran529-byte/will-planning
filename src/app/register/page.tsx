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
import { BrandLogo } from '@/components/BrandLogo';
import WeChatFollow from '@/components/WeChatFollow';
import { safeReturnTo } from '@/lib/safe-return';

export const metadata: Metadata = {
  title: '注册',
  description: '免费注册家有所爱账号, 3 分钟即可开始生成您的家庭文书',
  alternates: {
    canonical: 'https://h5.aiwill-planner.cn/register',
  },
  robots: {
    index: false,
    follow: false,
  },
};

interface PageProps {
  searchParams: Promise<{ return?: string }>;
}

export default async function RegisterPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.return, '/login?registered=1');
  // 给"已有账号"链接的 returnTo: 优先保留用户传入的 return, 否则用 /dashboard
  const loginReturnTo = returnTo.startsWith('/login') ? '/dashboard' : returnTo;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-amber-600 transition"
          >
            <BrandLogo size="sm" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2 leading-tight-cn">创建您的账号</h1>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed-cn">
            几秒钟即可完成, 立即管理您的法律文书
          </p>

          <RegisterForm returnTo={returnTo} />

          <div className="mt-6 pt-6 border-t border-slate-100 text-center text-sm text-slate-600">
            已有账号?{' '}
            <Link
              href={`/login?return=${encodeURIComponent(loginReturnTo)}&intent=login`}
              className="text-amber-600 hover:text-amber-700 font-semibold"
            >
              立即登录
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500 leading-relaxed-cn">
          <p>
            管理员请去{' '}
            <a href="/admin/login" className="text-slate-700 hover:text-amber-600 underline">管理员入口</a>
          </p>
        </div>

        {/* 改版 v2 (2026-07-11): 公众号二维码引导卡片 (放在注册表单下方,
            用户注册前后扫码关注, 提升公众号关注率). 图为 WechatIMG344.jpg. */}
        <div className="mt-8">
          <WeChatFollow variant="card" mpName="爱的延续" mpSearchKeyword="爱的延续" />
        </div>
      </div>
    </div>
  );
}
