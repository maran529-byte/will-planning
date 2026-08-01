/**
 * /orders - host-aware 渲染
 *
 * 架构 (2026-07-23):
 *   - 主站 host: 跳 H5 卡片, 0 form 0 input (合规要求)
 *   - H5 host: 真实订单列表 + 详情弹窗
 */

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { isH5Host } from '@/lib/host';
import { OrdersClientRoot } from './OrdersClient';

export const metadata: Metadata = {
  title: '我的订单 · 家有所爱',
  description: '查看您已创建的文书订单',
  alternates: {
    canonical: 'https://h5.aiwill-planner.cn/orders',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default async function OrdersPage() {
  const host = (await headers()).get('host') ?? '';
  const isH5 = isH5Host(host);

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
            <div className="text-6xl mb-4" aria-hidden="true">📋</div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2 leading-tight-cn">我的订单</h1>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed-cn">
              订单详情、支付记录、草稿下载已迁移到 H5 移动端，享受更顺滑的查看体验。
            </p>

            <Link
              href="https://h5.aiwill-planner.cn/orders"
              className="block w-full py-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              前往 H5 查看订单 →
            </Link>

            <div className="mt-6 pt-6 border-t border-slate-100 text-sm text-slate-600">
              没有账号?{' '}
              <Link
                href="https://h5.aiwill-planner.cn/register"
                className="text-amber-600 hover:text-amber-700 font-semibold"
              >
                立即注册
              </Link>
            </div>

            <hr className="my-8" />

            <div className="text-xs text-slate-400 space-y-1">
              <p>遇到问题?</p>
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

  return <OrdersClientRoot />;
}
