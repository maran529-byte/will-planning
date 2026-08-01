/**
 * /register - host-aware 渲染
 *
 * 架构 (2026-07-23):
 *   - 主站 host: 跳 H5 卡片, 0 form 0 input
 *   - H5 host: 真实注册表单
 */

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { isH5Host } from '@/lib/host';
import { RegisterForm } from './RegisterForm';

export const metadata: Metadata = {
  title: '注册 · 家有所爱',
  description: '创建家有所爱账号, 开始您的心意规划',
  alternates: {
    canonical: 'https://h5.aiwill-planner.cn/register',
  },
  robots: {
    index: false,
    follow: true,
  },
};

interface PageProps {
  searchParams: {
    return?: string;
    ref?: string;
  };
}

export default async function RegisterPage({ searchParams }: PageProps) {
  const host = (await headers()).get('host') ?? '';
  const isH5 = isH5Host(host);
  const returnTo = searchParams.return ?? '/orders';
  const refCode = searchParams.ref ?? null;

  if (!isH5) {
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

          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4" aria-hidden="true">💝</div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2 leading-tight-cn">
              创建您的账号
            </h1>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed-cn">
              注册后可保存问卷进度、查看历史文书、参与博主计划。
            </p>

            <div className="bg-amber-50 rounded-2xl p-4 text-left text-sm text-slate-700">
              <p className="font-medium">注册将获得:</p>
              <ul className="mt-2 space-y-1 list-disc list-inside text-slate-600">
                <li>3 份免费文书试生成额度</li>
                <li>专属 7×24 公众号客服</li>
                <li>问卷断点续填功能</li>
                <li>博主计划 15~30% 佣金</li>
              </ul>
            </div>

            <Link
              href={`https://h5.aiwill-planner.cn/register${refCode ? `?ref=${encodeURIComponent(refCode)}` : ''}`}
              className="mt-8 block w-full py-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              前往 H5 注册 →
            </Link>

            <div className="mt-6 pt-6 border-t border-slate-100 text-sm text-slate-600">
              已有账号?{' '}
              <Link
                href="https://h5.aiwill-planner.cn/login"
                className="text-amber-600 hover:text-amber-700 font-semibold"
              >
                立即登录
              </Link>
            </div>
          </div>

          <div className="mt-8 text-xs text-slate-400 text-center">
            家有所爱工作室 © 2026 · 沪ICP备2026020925号-1
          </div>
        </div>
      </div>
    );
  }

  return <RegisterForm returnTo={returnTo} refCode={refCode} />;
}
