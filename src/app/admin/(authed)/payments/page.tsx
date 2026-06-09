import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase-server';
import { timeAgo } from '@/lib/admin-helpers';

/**
 * /admin/payments 支付流水
 *
 * 改版 v2 (2026-06-09):
 *   - 改用 @/lib/admin-helpers 共享 timeAgo
 *   - 删除本地 timeAgo
 *   - 添加 leading-tight-cn / leading-relaxed-cn / tabular-nums
 *   - 提示框加 role="status" + aria-label
 *   - 表格加 aria-label + <th scope="col">
 *   - 添加 pb-safe
 */

export const dynamic = 'force-dynamic';

interface EventRow {
  id: number;
  order_id: string;
  channel: string;
  event_type: string;
  external_event_id: string | null;
  processed_at: string;
  error_message: string | null;
}

async function loadEvents() {
  if (!supabaseAdmin) return [];
  const { data } = await supabaseAdmin
    .from('payment_events')
    .select('id, order_id, channel, event_type, external_event_id, processed_at, error_message')
    .order('processed_at', { ascending: false })
    .range(0, 99);
  return (data || []) as EventRow[];
}

const CHANNEL_LABEL: Record<string, string> = {
  alipay_h5: '支付宝 H5',
  wechat_h5: '微信 H5',
  stripe: 'Stripe',
  bank_transfer: '对公转账',
  free: '免费',
};

export default async function AdminPaymentsPage() {
  const events = await loadEvents();

  return (
    <div className="space-y-4 pb-safe">
      <h1 className="text-2xl font-bold text-slate-800 leading-tight-cn">
        <span aria-hidden>💳 </span>支付流水 (
        <span className="tabular-nums">{events.length}</span>)
      </h1>

      <div
        className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900 leading-relaxed-cn"
        role="status"
        aria-label="支付流水用途说明"
      >
        <p className="font-medium mb-1 leading-tight-cn">用途</p>
        <p>支付 webhook 事件流水, 用于审计 + 调试。Phase 1 manual 模式不会有事件 (无 webhook)。</p>
        <p className="mt-1">Phase 5 接入微信支付商户号后, 事件会从这里出现。</p>
      </div>

      <div className="rounded-xl bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]" aria-label="支付事件流水">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th scope="col" className="px-4 py-2 text-right">ID</th>
              <th scope="col" className="px-4 py-2 text-left">订单</th>
              <th scope="col" className="px-4 py-2 text-left">渠道</th>
              <th scope="col" className="px-4 py-2 text-left">事件类型</th>
              <th scope="col" className="px-4 py-2 text-left">外部事件 ID</th>
              <th scope="col" className="px-4 py-2 text-left">错误</th>
              <th scope="col" className="px-4 py-2 text-right">处理时间</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-slate-400 leading-relaxed-cn"
                >
                  暂无支付事件 (Phase 1 manual 模式无 webhook, 正常)
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 text-right text-xs text-slate-500 tabular-nums">{e.id}</td>
                  <td className="px-4 py-2 font-mono text-xs tabular-nums">
                    <Link
                      href={`/admin/orders?q=${e.order_id}`}
                      className="hover:underline focus-ring-visible"
                    >
                      {e.order_id.substring(0, 8)}...
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-xs leading-tight-cn">
                    {CHANNEL_LABEL[e.channel] || e.channel}
                  </td>
                  <td className="px-4 py-2 text-xs font-mono">{e.event_type}</td>
                  <td className="px-4 py-2 text-xs text-slate-500 max-w-[150px] truncate">
                    {e.external_event_id || '-'}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {e.error_message ? (
                      <span className="text-red-600" role="status" aria-label="错误">
                        {e.error_message}
                      </span>
                    ) : (
                      <span className="text-emerald-600" role="status" aria-label="成功">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-slate-500 tabular-nums">
                    {timeAgo(e.processed_at)}
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
