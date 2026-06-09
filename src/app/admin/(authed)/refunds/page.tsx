import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase-server';
import { formatYuan, timeAgo, PlanBadge } from '@/lib/admin-helpers';
import { RefundActionButton } from './RefundActionButton';

/**
 * /admin/refunds 退款管理
 *
 * 改版 v2 (2026-06-09):
 *   - 改用 @/lib/admin-helpers 共享 formatYuan / timeAgo / PlanBadge
 *   - 删除本地 formatYuan / timeAgo
 *   - 添加 leading-tight-cn / leading-relaxed-cn / tabular-nums 排版
 *   - 提示框加 role="status" + aria-label
 *   - 表格加 aria-label + <th scope="col">
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

export default async function AdminRefundsPage() {
  const orders = await loadPaidOrders();

  return (
    <div className="space-y-4 pb-safe">
      <h1 className="text-2xl font-bold text-slate-800 leading-tight-cn">
        <span aria-hidden>💸 </span>退款管理 (
        <span className="tabular-nums">{orders.length}</span>)
      </h1>

      <div
        className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 leading-relaxed-cn"
        role="status"
        aria-label="退款流程说明"
      >
        <p className="font-medium mb-1 leading-tight-cn">退款流程</p>
        <p>仅 paid 状态订单可退款。点击「退款」按钮 → 输入原因 → 订单变 refunded。</p>
        <p className="mt-1">
          真实退款需手动通过微信转账 (Phase 1 manual 模式) 或商户号 (Phase 5)。
        </p>
      </div>

      <div className="rounded-xl bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]" aria-label="可退款订单列表">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th scope="col" className="px-4 py-2 text-left">订单号</th>
              <th scope="col" className="px-4 py-2 text-left">openid</th>
              <th scope="col" className="px-4 py-2 text-left">套餐</th>
              <th scope="col" className="px-4 py-2 text-right">金额</th>
              <th scope="col" className="px-4 py-2 text-left">渠道</th>
              <th scope="col" className="px-4 py-2 text-left">支付时间</th>
              <th scope="col" className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-slate-400 leading-relaxed-cn"
                >
                  暂无可退款订单
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-xs tabular-nums">
                    <Link
                      href={`/admin/orders?q=${o.order_no}`}
                      className="hover:underline focus-ring-visible"
                    >
                      {o.order_no}
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500 max-w-[120px] truncate">
                    {o.openid || '-'}
                  </td>
                  <td className="px-4 py-2">
                    <PlanBadge plan={o.plan} />
                  </td>
                  <td className="px-4 py-2 text-right font-semibold tabular-nums">
                    {formatYuan(o.amount)}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500 leading-tight-cn">
                    {o.payment_channel || '-'}
                    {o.payment_method ? ` · ${o.payment_method}` : ''}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500 tabular-nums">
                    {timeAgo(o.paid_at)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <RefundActionButton
                      orderId={o.id}
                      orderNo={o.order_no}
                      amount={o.amount}
                    />
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
