import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase-server';
import {
  formatYuan,
  timeAgo,
  OrderStatusBadge,
  PlanBadge,
} from '@/lib/admin-helpers';
import { OrderActionButtons } from './OrderActionButtons';

/**
 * /admin/orders 订单列表
 *
 * 改版 v2 (2026-06-09):
 *   - 改用 @/lib/admin-helpers 共享 formatYuan / timeAgo / Badge
 *   - 删除本地 formatYuan / timeAgo / StatusBadge (重复代码)
 *   - 移动 import { OrderActionButtons } 从中间到顶部 (原文件是 anti-pattern)
 *   - 添加 leading-tight-cn / leading-relaxed-cn / tabular-nums 排版
 *   - 表格加 aria-label + <th scope="col">
 *   - 表单 label 用 htmlFor 关联 + input 16px 防 iOS 放大
 *   - 套餐列改用 PlanBadge (与 dashboard 一致)
 *   - 金额 / 时间用 tabular-nums
 *   - 添加 pb-safe
 */

export const dynamic = 'force-dynamic';

interface OrderRow {
  id: string;
  order_no: string;
  amount: number;
  plan: string;
  status: string;
  payment_channel: string | null;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  openid: string | null;
  will_id: string | null;
}

async function loadOrders(searchParams: { status?: string; q?: string }) {
  if (!supabaseAdmin) return { orders: [], total: 0 };
  let query = supabaseAdmin
    .from('orders')
    .select('id, order_no, amount, plan, status, payment_channel, payment_method, paid_at, created_at, openid, will_id', { count: 'exact' });

  if (searchParams.status) query = query.eq('status', searchParams.status);
  if (searchParams.q) {
    query = query.or(`order_no.ilike.%${searchParams.q}%,openid.ilike.%${searchParams.q}%`);
  }

  query = query.order('created_at', { ascending: false }).range(0, 99);
  const { data, count } = await query;
  return { orders: (data || []) as OrderRow[], total: count || 0 };
}

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待支付' },
  { value: 'paid', label: '已支付' },
  { value: 'refunded', label: '已退款' },
  { value: 'cancelled', label: '已取消' },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const { orders, total } = await loadOrders(sp);

  return (
    <div className="space-y-4 pb-safe">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 leading-tight-cn">
          <span aria-hidden>📋 </span>订单 (<span className="tabular-nums">{total}</span>)
        </h1>
      </div>

      {/* 过滤栏 */}
      <form
        className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-end gap-3"
        aria-label="订单过滤"
      >
        <div>
          <label
            htmlFor="order-status"
            className="block text-xs text-slate-600 mb-1 leading-tight-cn"
          >
            状态
          </label>
          <select
            id="order-status"
            name="status"
            defaultValue={sp.status || ''}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm focus-ring-visible"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="order-q"
            className="block text-xs text-slate-600 mb-1 leading-tight-cn"
          >
            搜索 (订单号/openid)
          </label>
          <input
            id="order-q"
            name="q"
            defaultValue={sp.q || ''}
            placeholder="ORDxxxx 或 访客编号"
            inputMode="search"
            // 改版 v2: 16px 防 iOS 自动放大
            style={{ fontSize: '16px' }}
            className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus-ring-visible"
          />
        </div>
        <button
          type="submit"
          className="rounded bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 text-sm font-medium focus-ring-visible leading-tight-cn"
        >
          过滤
        </button>
        {(sp.status || sp.q) && (
          <Link
            href="/admin/orders"
            className="text-sm text-slate-500 hover:text-slate-700 focus-ring-visible"
          >
            清除
          </Link>
        )}
      </form>

      {/* 订单表 */}
      <div className="rounded-xl bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]" aria-label="订单列表">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th scope="col" className="px-4 py-2 text-left">订单号</th>
              <th scope="col" className="px-4 py-2 text-left">openid</th>
              <th scope="col" className="px-4 py-2 text-left">套餐</th>
              <th scope="col" className="px-4 py-2 text-right">金额</th>
              <th scope="col" className="px-4 py-2 text-left">状态</th>
              <th scope="col" className="px-4 py-2 text-left">渠道</th>
              <th scope="col" className="px-4 py-2 text-left">支付时间</th>
              <th scope="col" className="px-4 py-2 text-left">创建</th>
              <th scope="col" className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-slate-400 leading-relaxed-cn"
                >
                  暂无订单
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <OrderRowComp key={o.id} order={o} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 服务端组件 + 客户端操作按钮 分离
function OrderRowComp({ order }: { order: OrderRow }) {
  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50">
      <td className="px-4 py-2 font-mono text-xs tabular-nums">{order.order_no}</td>
      <td className="px-4 py-2 font-mono text-xs text-slate-500 max-w-[120px] truncate">
        {order.openid || '-'}
      </td>
      <td className="px-4 py-2">
        <PlanBadge plan={order.plan} />
      </td>
      <td className="px-4 py-2 text-right font-semibold tabular-nums">
        {formatYuan(order.amount)}
      </td>
      <td className="px-4 py-2">
        <OrderStatusBadge status={order.status} />
      </td>
      <td className="px-4 py-2 text-xs text-slate-500 leading-tight-cn">
        {order.payment_channel || '-'}
        {order.payment_method ? ` · ${order.payment_method}` : ''}
      </td>
      <td className="px-4 py-2 text-xs text-slate-500 tabular-nums">
        {order.paid_at ? new Date(order.paid_at).toLocaleString('zh-CN') : '-'}
      </td>
      <td className="px-4 py-2 text-xs text-slate-500 tabular-nums">
        {timeAgo(order.created_at)}
      </td>
      <td className="px-4 py-2 text-right">
        <OrderActionButtons
          orderId={order.id}
          status={order.status}
          paymentMethod={order.payment_method}
        />
      </td>
    </tr>
  );
}
