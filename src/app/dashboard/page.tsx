/**
 * /dashboard - 静态展示 + 跳 H5
 *
 * 改版 v2 (2026-07-22, 方案 A 合规修复):
 *   - 旧: requireUser() 鉴权 + UserNavBar + LogoutButton, 调 /api/auth/* 链路
 *   - 新: 纯静态展示页, 跳 H5 dashboard 完成所有交互
 *   - 架构要求: 主站 0 form 0 input 0 /api/* 调用
 *   - 架构要求文档: /Users/maran/Desktop/架构要求.md
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '我的工作台 · 家有所爱',
  description: '查看您的心意规划订单、草稿、下载',
  alternates: {
    canonical: 'https://h5.aiwill-planner.cn/dashboard',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function DashboardPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white px-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-10">
        <div className="text-center">
          <div className="text-6xl mb-4" aria-hidden="true">📊</div>
          <h1 className="text-3xl font-bold text-slate-900">我的工作台</h1>
          <p className="mt-4 text-slate-600">
            您的订单、草稿、下载、佣金记录均在 H5 移动端管理。
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="https://h5.aiwill-planner.cn/orders"
            className="p-6 border-2 border-slate-200 rounded-2xl hover:border-amber-500 hover:shadow-md transition-all"
          >
            <div className="text-3xl" aria-hidden="true">📋</div>
            <h3 className="mt-2 font-semibold">我的订单</h3>
            <p className="mt-1 text-sm text-slate-500">查看所有文书订单</p>
          </Link>

          <Link
            href="https://h5.aiwill-planner.cn/result"
            className="p-6 border-2 border-slate-200 rounded-2xl hover:border-amber-500 hover:shadow-md transition-all"
          >
            <div className="text-3xl" aria-hidden="true">📄</div>
            <h3 className="mt-2 font-semibold">文书草稿</h3>
            <p className="mt-1 text-sm text-slate-500">查看生成中的文书</p>
          </Link>

          <Link
            href="https://h5.aiwill-planner.cn/account"
            className="p-6 border-2 border-slate-200 rounded-2xl hover:border-amber-500 hover:shadow-md transition-all"
          >
            <div className="text-3xl" aria-hidden="true">⚙️</div>
            <h3 className="mt-2 font-semibold">账户设置</h3>
            <p className="mt-1 text-sm text-slate-500">修改资料 / 绑定微信</p>
          </Link>

          <Link
            href="https://h5.aiwill-planner.cn/affiliate"
            className="p-6 border-2 border-slate-200 rounded-2xl hover:border-amber-500 hover:shadow-md transition-all"
          >
            <div className="text-3xl" aria-hidden="true">💰</div>
            <h3 className="mt-2 font-semibold">博主佣金</h3>
            <p className="mt-1 text-sm text-slate-500">推广返佣 / 提现</p>
          </Link>
        </div>

        <Link
          href="https://h5.aiwill-planner.cn/dashboard"
          className="mt-8 block w-full py-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-2xl text-center text-lg font-semibold"
        >
          前往 H5 我的工作台 →
        </Link>

        <div className="mt-8 text-xs text-slate-400 text-center">
          家有所爱工作室 © 2026 · 沪ICP备2026020925号-1
        </div>
      </div>
    </main>
  );
}
