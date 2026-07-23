/**
 * /account - 静态展示 + 跳 H5
 *
 * 改版 v2 (2026-07-22, 方案 A 合规修复):
 *   - 旧: 嵌入 AccountContent, 调 /api/* 拉订单/发票 (主站变成 dynamic)
 *   - 新: 纯静态展示页, 跳 H5 account
 *   - 架构要求: 主站 0 form 0 input 0 /api/* 调用
 *   - 架构要求文档: /Users/maran/Desktop/架构要求.md
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '我的账户 · 家有所爱',
  description: '管理家有所爱账户信息',
  alternates: {
    canonical: 'https://h5.aiwill-planner.cn/account',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function AccountPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
        <div className="text-6xl mb-4" aria-hidden="true">👤</div>
        <h1 className="text-3xl font-bold text-slate-900">我的账户</h1>
        <p className="mt-4 text-slate-600">
          账户信息、订单历史、佣金记录均在 H5 移动端管理。
        </p>

        <Link
          href="https://h5.aiwill-planner.cn/account"
          className="mt-8 block w-full py-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-2xl text-lg font-semibold"
        >
          前往 H5 我的账户 →
        </Link>

        <div className="mt-6 text-sm text-slate-500">
          未登录?{' '}
          <Link href="https://h5.aiwill-planner.cn/login" className="text-amber-500">
            立即登录
          </Link>
        </div>

        <div className="mt-8 text-xs text-slate-400">
          家有所爱工作室 © 2026 · 沪ICP备2026020925号-1
        </div>
      </div>
    </main>
  );
}
