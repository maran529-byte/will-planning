/**
 * /custom - 定制服务留言 (业务铁律 v1.0 · 2026-07-24)
 *
 * 主站 host: 跳转 H5 卡片 (合规要求 0 form 0 input)
 * H5 host: 真实表单 (姓名/手机/需求描述 → 自动邮件 330320991@qq.com)
 */

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { isH5Host } from '@/lib/host';
import { CustomForm } from './CustomForm';

export const metadata: Metadata = {
  title: '定制服务留言 · 家有所爱',
  description: '需要 19.9 之外的定制服务? 留下您的需求, 我们 24h 内邮件回复。',
  alternates: {
    canonical: 'https://h5.aiwill-planner.cn/custom',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function CustomPage() {
  const host = (await headers()).get('host') ?? '';
  const isH5 = isH5Host(host);

  if (!isH5) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4" aria-hidden="true">📮</div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2 leading-tight-cn">
              定制服务留言
            </h1>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed-cn">
              ¥19.9 是 6 类标准文书的统一价格。<br />
              如需复杂资产 / 多份文书 / 企业级定制, 请留言。
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left text-xs text-slate-700 mb-6 leading-relaxed-cn">
              <p className="font-semibold mb-1">📞 我们的承诺</p>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>留言后 24 小时内邮件回复</li>
                <li>复杂案件由资深律师评估</li>
                <li>报价透明, 无隐藏费用</li>
              </ul>
            </div>

            <Link
              href="https://h5.aiwill-planner.cn/custom"
              className="block w-full py-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              前往 H5 留言 →
            </Link>

            <div className="mt-6 text-xs text-slate-400">
              联系邮箱: 330320991@qq.com
            </div>
          </div>

          <div className="mt-8 text-xs text-slate-400 text-center">
            家有所爱工作室 © 2026 · 沪ICP备2026020925号-1
          </div>
        </div>
      </div>
    );
  }

  return <CustomForm />;
}