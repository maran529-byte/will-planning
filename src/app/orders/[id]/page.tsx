/**
 * /orders/[id] - host-aware 渲染
 *
 * 架构 (2026-07-23):
 *   - 主站 host: 跳 H5 订单中心卡片, 0 form 0 input (合规要求)
 *   - H5 host: 真实订单详情 (鉴权 + 调 /api/orders/:id)
 */

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { isH5Host } from '@/lib/host';
import { OrderDetailClientRoot } from './OrderDetailClient';

export const metadata: Metadata = {
  title: '订单详情 · 家有所爱',
  description: '查看您订单的完整信息',
  alternates: {
    canonical: 'https://h5.aiwill-planner.cn/orders',
  },
  robots: {
    index: false,
    follow: false,
  },
};

interface PageProps {
  params: {
    id: string;
  };
}

export default async function OrderDetailPage({ params }: PageProps) {
  const host = (await headers()).get('host') ?? '';
  const isH5 = isH5Host(host);
  const orderId = params.id;

  if (!isH5) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-amber-600 transition">
              <BrandLogo size="sm" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4" aria-hidden="true">📦</div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2 leading-tight-cn">订单详情</h1>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed-cn">
              出于隐私保护，订单详情已迁移到 H5 移动端，请在下方入口查看。
            </p>

            <Link
              href={`https://h5.aiwill-planner.cn/orders/${orderId}`}
              className="block w-full py-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              前往 H5 查看 →
            </Link>

            <div className="mt-6 pt-6 border-t border-slate-100 text-sm text-slate-600">
              <p>
                查看其他订单?{' '}
                <Link
                  href="https://h5.aiwill-planner.cn/orders"
                  className="text-amber-600 hover:text-amber-700 font-semibold"
                >
                  我的订单
                </Link>
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

  return <OrderDetailClientRoot />;
}
