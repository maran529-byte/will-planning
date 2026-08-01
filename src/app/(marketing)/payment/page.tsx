/**
 * /payment - host-aware 渲染
 *
 * 架构 (2026-07-23):
 *   - 主站 host: 跳 H5 卡片, 0 form 0 input (合规要求)
 *   - H5 host: 真实支付流程 (虎皮椒/微信/支付宝 + 30s 轮询)
 *
 * 原始 600+ 行 page.tsx 已备份到 .compliance-backup/payment-page.tsx.bak,
 * 业务代码提取到 PaymentClient.tsx
 */

import { headers } from 'next/headers';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { isH5Host } from '@/lib/host';
import { PaymentClientRoot } from './PaymentClient';

interface PageProps {
  searchParams: {
    plan?: string;
    order?: string;
    will_id?: string;
    doc_id?: string;
  };
}

export default async function PaymentPage({ searchParams }: PageProps) {
  const host = (await headers()).get('host') ?? '';
  const isH5 = isH5Host(host);

  if (!isH5) {
    const plan = searchParams.plan ?? 'ai';
    const order = searchParams.order;
    const willId = searchParams.will_id ?? searchParams.doc_id;

    const h5Params = new URLSearchParams();
    h5Params.set('plan', plan);
    if (order) h5Params.set('order', order);
    if (willId) h5Params.set('will_id', willId);

    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-amber-600 transition">
              <BrandLogo size="sm" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4" aria-hidden="true">💳</div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2 leading-tight-cn">订单支付</h1>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed-cn">
              支付入口已迁移到 H5 移动端，支持微信支付 / 虎皮椒收银台 / 人工确认多种方式。
            </p>

            <Link
              href={`https://h5.aiwill-planner.cn/payment?${h5Params.toString()}`}
              className="block w-full py-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              前往 H5 支付 →
            </Link>

            <div className="mt-6 pt-6 border-t border-slate-100 text-sm text-slate-600">
              <p>
                还未登录?{' '}
                <Link
                  href="https://h5.aiwill-planner.cn/login"
                  className="text-amber-600 hover:text-amber-700 font-semibold"
                >
                  立即登录
                </Link>
              </p>
            </div>

            <hr className="my-8" />

            <div className="text-xs text-slate-400 space-y-1">
              <p>支付中遇到问题?</p>
              <p>
                微信搜 <span className="text-amber-500">家有所爱</span> 联系客服
                · 或发邮件至{' '}
                <a href="mailto:330320991@qq.com" className="text-amber-500">
                  330320991@qq.com
                </a>
              </p>
            </div>
          </div>

          <div className="mt-8 text-xs text-slate-400 text-center">
            家有所爱工作室 © 2026 · 沪ICP备2026020925号-1
          </div>
        </div>
      </div>
    );
  }

  return <PaymentClientRoot />;
}
