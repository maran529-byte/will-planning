import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  received: { label: '⏳ 收到', cls: 'bg-amber-100 text-amber-700' },
  processed: { label: '✅ 已处理', cls: 'bg-emerald-100 text-emerald-700' },
  failed: { label: '❌ 失败', cls: 'bg-red-100 text-red-700' },
  ignored: { label: '⏭ 忽略', cls: 'bg-slate-100 text-slate-500' },
};

const CHANNEL_BADGES: Record<string, { label: string; cls: string }> = {
  wechat: { label: '微信', cls: 'bg-green-100 text-green-700' },
  alipay: { label: '支付宝', cls: 'bg-blue-100 text-blue-700' },
  manual: { label: '人工', cls: 'bg-amber-100 text-amber-700' },
};

async function loadEvents(status?: string) {
  if (!supabaseAdmin) return [];
  let query = supabaseAdmin
    .from('payment_events')
    .select('id, channel, external_event_id, order_no, status, error_message, attempts, processed_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  const { data } = await query;
  return data || [];
}

export default async function PaymentEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const auth = await requireAdmin();
  if (!auth.authenticated) {
    return <div>无权访问</div>;
  }

  const { status } = await searchParams;
  const events = await loadEvents(status);

  // 计数
  const counts = await supabaseAdmin
    ?.from('payment_events')
    .select('status', { count: 'exact', head: false });
  const statusCounts: Record<string, number> = {};
  for (const e of counts?.data || []) {
    statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
  }
  const totalCount = counts?.count || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-1">💰 支付回调事件</h1>
        <p className="text-sm text-slate-600">
          微信 / 支付宝回调事件流水. 失败事件可手动重试.
        </p>
      </div>

      {/* 状态筛选 tab */}
      <div className="flex flex-wrap gap-2">
        {[
          { v: 'all', l: '全部', n: totalCount },
          { v: 'received', l: '待处理', n: statusCounts.received || 0 },
          { v: 'processed', l: '已处理', n: statusCounts.processed || 0 },
          { v: 'failed', l: '失败', n: statusCounts.failed || 0 },
          { v: 'ignored', l: '忽略', n: statusCounts.ignored || 0 },
        ].map((tab) => (
          <Link
            key={tab.v}
            href={`/admin/payment-events?status=${tab.v}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${
              (status || 'all') === tab.v
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.l} ({tab.n})
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {events.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            暂无 {status && status !== 'all' ? STATUS_BADGES[status]?.label : ''} 事件
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left">渠道</th>
                <th className="px-4 py-2 text-left">订单号</th>
                <th className="px-4 py-2 text-left">外部 ID</th>
                <th className="px-4 py-2 text-left">状态</th>
                <th className="px-4 py-2 text-right">重试</th>
                <th className="px-4 py-2 text-left">错误</th>
                <th className="px-4 py-2 text-right">时间</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const statusBadge = STATUS_BADGES[e.status] || STATUS_BADGES.received;
                const channelBadge = CHANNEL_BADGES[e.channel] || CHANNEL_BADGES.manual;
                return (
                  <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${channelBadge.cls}`}>
                        {channelBadge.label}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{e.order_no || '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-500 truncate max-w-[200px]">
                      {e.external_event_id}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${statusBadge.cls}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-slate-500">
                      {e.attempts > 0 ? `${e.attempts}x` : '—'}
                    </td>
                    <td className="px-4 py-2 text-xs text-red-600 max-w-[200px] truncate">
                      {e.error_message || '—'}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-slate-500">
                      {new Date(e.created_at).toLocaleString('zh-CN', { hour12: false })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
        <div className="font-semibold mb-2">📖 事件状态说明</div>
        <ul className="space-y-1 text-blue-800">
          <li>• <strong>received</strong>: 已记录, 待处理 (异常: 重试多次仍未处理)</li>
          <li>• <strong>processed</strong>: 业务处理成功, 订单已更新为 paid</li>
          <li>• <strong>failed</strong>: 业务处理失败 (订单不存在 / 金额不一致 / DB 错误)</li>
          <li>• <strong>ignored</strong>: 主动忽略 (如 trade_state=REFUND)</li>
        </ul>
      </div>
    </div>
  );
}
