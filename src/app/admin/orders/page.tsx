import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase-server';

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

function formatYuan(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  const d = Math.floor(h / 24);
  return `${d}天前`;
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">📋 订单 ({total})</h1>
      </div>

      {/* 过滤栏 */}
      <form className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-slate-600 mb-1">状态</label>
          <select
            name="status"
            defaultValue={sp.status || ''}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-slate-600 mb-1">搜索 (订单号/openid)</label>
          <input
            name="q"
            defaultValue={sp.q || ''}
            placeholder="ORDxxxx 或 访客编号"
            className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 text-sm font-medium"
        >
          过滤
        </button>
        {(sp.status || sp.q) && (
          <Link href="/admin/orders" className="text-sm text-slate-500 hover:text-slate-700">
            清除
          </Link>
        )}
      </form>

      {/* 订单表 */}
      <div className="rounded-xl bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-2 text-left">订单号</th>
              <th className="px-4 py-2 text-left">openid</th>
              <th className="px-4 py-2 text-left">套餐</th>
              <th className="px-4 py-2 text-right">金额</th>
              <th className="px-4 py-2 text-left">状态</th>
              <th className="px-4 py-2 text-left">渠道</th>
              <th className="px-4 py-2 text-left">支付时间</th>
              <th className="px-4 py-2 text-left">创建</th>
              <th className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
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

import { OrderActionButtons } from './OrderActionButtons';

// 服务端组件 + 客户端操作按钮 分离
function OrderRowComp({ order }: { order: OrderRow }) {
  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50">
      <td className="px-4 py-2 font-mono text-xs">{order.order_no}</td>
      <td className="px-4 py-2 font-mono text-xs text-slate-500 max-w-[120px] truncate">
        {order.openid || '-'}
      </td>
      <td className="px-4 py-2">{order.plan}</td>
      <td className="px-4 py-2 text-right font-semibold">{formatYuan(order.amount)}</td>
      <td className="px-4 py-2">
        <StatusBadge status={order.status} />
      </td>
      <td className="px-4 py-2 text-xs text-slate-500">
        {order.payment_channel || '-'}
        {order.payment_method ? ` · ${order.payment_method}` : ''}
      </td>
      <td className="px-4 py-2 text-xs text-slate-500">
        {order.paid_at ? new Date(order.paid_at).toLocaleString('zh-CN') : '-'}
      </td>
      <td className="px-4 py-2 text-xs text-slate-500">{timeAgo(order.created_at)}</td>
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: '待支付', cls: 'bg-amber-100 text-amber-700' },
    paid: { label: '已支付', cls: 'bg-emerald-100 text-emerald-700' },
    refunded: { label: '已退款', cls: 'bg-slate-100 text-slate-600' },
    cancelled: { label: '已取消', cls: 'bg-red-100 text-red-700' },
  };
  const m = map[status] || { label: status, cls: 'bg-slate-100 text-slate-600' };
  return <span className={`text-xs px-2 py-0.5 rounded ${m.cls}`}>{m.label}</span>;
}
