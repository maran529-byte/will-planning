/**
 * /feedback - host-aware 渲染
 *
 * 架构 (2026-07-23):
 *   - 主站 host: 卡片 + 红宝奖励说明 (SEO 价值页, index=true)
 *   - H5 host: 真实反馈表单
 */

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { isH5Host } from '@/lib/host';
import { FeedbackForm } from './FeedbackForm';

export const metadata: Metadata = {
  title: '问题反馈 · 家有所爱',
  description: '向家有所爱团队提交问题反馈, 获 ¥5~¥50 红包奖励',
  alternates: {
    canonical: 'https://h5.aiwill-planner.cn/feedback',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function FeedbackPage() {
  const host = (await headers()).get('host') ?? '';
  const isH5 = isH5Host(host);

  if (!isH5) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
          <div className="text-6xl mb-4" aria-hidden="true">📮</div>
          <h1 className="text-3xl font-bold text-slate-900">问题反馈</h1>
          <p className="mt-4 text-slate-600">
            提交问题可获 <span className="text-amber-500 font-semibold">¥5~¥50</span> 红包奖励。
          </p>

          <div className="mt-6 bg-amber-50 rounded-2xl p-4 text-left text-sm text-slate-700">
            <p className="font-medium">反馈流程:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-slate-600">
              <li>微信扫码进入 H5</li>
              <li>填写问题类别 + 严重程度</li>
              <li>描述现象 + 复现步骤</li>
              <li>提交后 24h 内处理</li>
            </ul>
          </div>

          <Link
            href="https://h5.aiwill-planner.cn/feedback"
            className="mt-8 block w-full py-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-2xl text-lg font-semibold"
          >
            前往 H5 提交反馈 →
          </Link>

          <div className="mt-6 text-sm text-slate-500">
            紧急问题:微信搜 <span className="text-amber-500">家有所爱</span> 联系客服
          </div>

          <div className="mt-8 text-xs text-slate-400">
            家有所爱工作室 © 2026 · 沪ICP备2026020925号-1
          </div>
        </div>
      </main>
    );
  }

  return <FeedbackForm />;
}
