import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase-server';
import { RefundActionButton } from './RefundActionButton';

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
  openid: string | null;
}

async function loadPaidOrders() {
  if (!supabaseAdmin) return [];
  const { data } = await supabaseAdmin
    .from('orders')
    .select('id, order_no, amount, plan, status, payment_channel, payment_method, paid_at, openid')
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })
    .range(0, 99);
  return (data || []) as OrderRow[];
}

function formatYuan(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return '-';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  const d = Math.floor(h / 24);
  return `${d}天前`;
}

export default async function AdminRefundsPage() {
  const orders = await loadPaidOrders();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">💸 退款管理 ({orders.length})</h1>

      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
        <p className="font-medium mb-1">退款流程</p>
        <p>仅 paid 状态订单可退款。点击「退款」按钮 → 输入原因 → 订单变 refunded。</p>
        <p className="mt-1">真实退款需手动通过微信转账 (Phase 1 manual 模式) 或商户号 (Phase 5)。</p>
      </div>

      <div className="rounded-xl bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-2 text-left">订单号</th>
              <th className="px-4 py-2 text-left">openid</th>
              <th className="px-4 py-2 text-left">套餐</th>
              <th className="px-4 py-2 text-right">金额</th>
              <th className="px-4 py-2 text-left">渠道</th>
              <th className="px-4 py-2 text-left">支付时间</th>
              <th className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  暂无可退款订单
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-xs">
                    <Link href={`/admin/orders?q=${o.order_no}`} className="hover:underline">
                      {o.order_no}
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500 max-w-[120px] truncate">
                    {o.openid || '-'}
                  </td>
                  <td className="px-4 py-2">{o.plan}</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatYuan(o.amount)}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {o.payment_channel || '-'}
                    {o.payment_method ? ` · ${o.payment_method}` : ''}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">{timeAgo(o.paid_at)}</td>
                  <td className="px-4 py-2 text-right">
                    <RefundActionButton orderId={o.id} orderNo={o.order_no} amount={o.amount} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
