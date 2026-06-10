'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Order } from '@/lib/orders';
import type { InvoiceRequest } from '@/lib/invoices';
import InvoiceModal from './InvoiceModal';

interface Props {
  openid: string;
  orders: Order[];
  invoices: InvoiceRequest[];
  stats: {
    total_orders: number;
    paid_orders: number;
    pending_orders: number;
    refunded_orders: number;
    total_spent: number;
    pending_amount: number;
  };
}

function formatYuan(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const PLAN_NAMES: Record<string, { name: string; cls: string }> = {
  ai: { name: '智能版', cls: 'bg-slate-100 text-slate-700' },
  expert: { name: '专家护航版', cls: 'bg-amber-100 text-amber-700' },
  lawyer: { name: '专家(旧)', cls: 'bg-amber-50 text-amber-600' },
  family: { name: '家族(下架)', cls: 'bg-slate-50 text-slate-500' },
};

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  pending: { label: '⏳ 待支付', cls: 'bg-amber-100 text-amber-700' },
  paid: { label: '✅ 已支付', cls: 'bg-emerald-100 text-emerald-700' },
  refunded: { label: '↩️ 已退款', cls: 'bg-slate-100 text-slate-500' },
  cancelled: { label: '✕ 已取消', cls: 'bg-red-100 text-red-700' },
};

const INVOICE_STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  pending: { label: '待审核', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: '已通过', cls: 'bg-blue-100 text-blue-700' },
  rejected: { label: '已拒绝', cls: 'bg-red-100 text-red-700' },
  issued: { label: '✅ 已开票', cls: 'bg-emerald-100 text-emerald-700' },
};

export default function AccountContent({ openid, orders, invoices, stats }: Props) {
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  const maskedOpenid = openid ? `${openid.slice(0, 4)}****${openid.slice(-4)}` : '—';

  // 订单按 openid 过滤后, 按 created_at desc 排序
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // 每订单的发票申请 (按 order_id 索引)
  const invoiceByOrder = new Map<string, InvoiceRequest>();
  for (const inv of invoices) {
    invoiceByOrder.set(inv.order_id, inv);
  }

  return (
    <div className="space-y-6">
      {/* 账户信息卡 */}
      <div className="bg-white rounded-2xl shadow-sm p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-2xl text-white">
            👤
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500">当前登录账号</div>
            <div className="font-mono text-sm text-slate-800 mt-0.5">{maskedOpenid}</div>
            <div className="text-xs text-slate-500 mt-1">
              通过公众号「家有所爱」识别, 一年免登录
            </div>
          </div>
        </div>
      </div>

      {/* 4 统计卡 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="总订单" value={stats.total_orders.toString()} accent="slate" />
        <StatCard label="已支付" value={stats.paid_orders.toString()} accent="emerald" />
        <StatCard
          label="待支付"
          value={stats.pending_orders.toString()}
          subValue={stats.pending_amount > 0 ? formatYuan(stats.pending_amount) : undefined}
          accent={stats.pending_orders > 0 ? 'amber' : 'slate'}
        />
        <StatCard
          label="累计消费"
          value={formatYuan(stats.total_spent)}
          accent="amber"
        />
      </div>

      {/* 订单列表 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">📋 订单历史</h2>
        </div>

        {sortedOrders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-slate-500 text-sm mb-4">您还没有订单</p>
            <Link
              href="/questionnaire"
              className="inline-block bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-medium"
            >
              开始生成我的第一份文书
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sortedOrders.map((o) => {
              const plan = PLAN_NAMES[o.plan] || { name: o.plan, cls: 'bg-slate-100 text-slate-700' };
              const status = STATUS_BADGES[o.status] || STATUS_BADGES.pending;
              const invoice = invoiceByOrder.get(o.id);
              return (
                <div key={o.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded ${plan.cls}`}>
                          {plan.name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${status.cls}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-slate-500">
                        订单号: {o.order_no}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-amber-600">
                        {formatYuan(o.amount)}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {formatDate(o.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* 操作行 */}
                  <div className="flex flex-wrap gap-2">
                    {o.status === 'pending' && (
                      <Link
                        href={`/payment?plan=${o.plan}&will_id=${o.will_id || ''}`}
                        className="text-sm bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded-lg font-medium"
                      >
                        💳 立即支付
                      </Link>
                    )}

                    {o.status === 'paid' && o.will_id && (
                      <Link
                        href={`/result?id=${o.will_id}&plan=${o.plan}`}
                        className="text-sm bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-lg font-medium"
                      >
                        📄 查看文书
                      </Link>
                    )}

                    {o.status === 'paid' && (
                      invoice ? (
                        <div className="text-sm bg-slate-100 text-slate-600 px-4 py-1.5 rounded-lg flex items-center gap-2">
                          <span>📑</span>
                          <span>发票: {INVOICE_STATUS_BADGES[invoice.status]?.label || invoice.status}</span>
                          {invoice.status === 'issued' && invoice.invoice_url && (
                            <a
                              href={invoice.invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-600 hover:underline ml-1"
                            >
                              下载
                            </a>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setInvoiceOrder(o)}
                          className="text-sm bg-white border-2 border-amber-500 text-amber-600 hover:bg-amber-50 px-4 py-1.5 rounded-lg font-medium"
                        >
                          📑 申请发票
                        </button>
                      )
                    )}

                    {o.status === 'refunded' && (
                      <span className="text-sm text-slate-500 px-4 py-1.5">
                        退款金额: {formatYuan(o.amount)} · 已退回原支付方式
                      </span>
                    )}
                  </div>

                  {/* 发票驳回原因 */}
                  {invoice?.status === 'rejected' && invoice.admin_note && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                      驳回原因: {invoice.admin_note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 客服区 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 text-sm text-blue-900">
        <div className="font-semibold mb-2">💬 需要帮助?</div>
        <ul className="space-y-1 text-blue-800">
          <li>• 文书内容咨询: 微信公众号「家有所爱」客服</li>
          <li>• 发票 / 退款进度: 1-3 个工作日处理, 公众号回复「进度」</li>
          <li>• 紧急问题: 拨打客服电话 (工作日 9:00-22:00)</li>
        </ul>
      </div>

      {invoiceOrder && (
        <InvoiceModal
          order={invoiceOrder}
          onClose={() => setInvoiceOrder(null)}
          onSuccess={() => {
            setInvoiceOrder(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  subValue,
  accent,
}: {
  label: string;
  value: string;
  subValue?: string;
  accent: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-900 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    amber: 'bg-amber-50 text-amber-900 border-amber-200',
    red: 'bg-red-50 text-red-900 border-red-200',
    slate: 'bg-slate-50 text-slate-900 border-slate-200',
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[accent] || colorMap.slate}`}>
      <div className="text-xs font-medium opacity-80 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {subValue && <div className="text-xs opacity-70 mt-1">{subValue}</div>}
    </div>
  );
}
