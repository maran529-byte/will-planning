/**
 * /affiliate/dashboard - 静态展示 + 跳 H5
 *
 * 架构要求 (2026-07-23, 方案 A 合规修复):
 *   - 旧: SSR 拉 supabase + 完整博主数据展示 (主站违规)
 *   - 新: 静态展示 + 跳 H5 移动端博主工作台
 *   - 架构要求文档: /Users/maran/Desktop/架构要求.md
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';

export const metadata: Metadata = {
  title: '博主工作台 · 家有所爱',
  description: '查看推广数据、佣金明细、邀请下级 — 工作台已迁移到 H5 移动端',
  alternates: {
    canonical: 'https://h5.aiwill-planner.cn/affiliate/dashboard',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function AffiliateDashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-amber-600 transition">
            <BrandLogo size="sm" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4" aria-hidden>📊</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2 leading-tight-cn">博主工作台</h1>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed-cn">
            推广数据、佣金明细、提现申请、下级管理已迁移到 H5 移动端。
          </p>

          <Link
            href="https://h5.aiwill-planner.cn/affiliate/dashboard"
            className="block w-full py-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            前往 H5 博主工作台 →
          </Link>

          <div className="mt-6 pt-6 border-t border-slate-100 text-sm text-slate-600">
            还没有入驻?{' '}
            <Link
              href="https://h5.aiwill-planner.cn/affiliate"
              className="text-amber-600 hover:text-amber-700 font-semibold"
            >
              立即申请
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
