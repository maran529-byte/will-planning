import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import {
  formatYuan,
  formatYuanCompact,
  timeAgo,
  StatCard,
  OrderStatusBadge,
  PlanBadge,
  WITHDRAWAL_METHOD_LABEL,
} from '@/lib/admin-helpers';

/**
 * /admin (概览) 仪表盘
 *
 * 改版 v2 (2026-06-09):
 *   - 改用 @/lib/admin-helpers 共享 formatYuan / timeAgo / StatCard / Badge
 *   - 删除本地 StatCard / PlanBadge / StatusBadge (重复代码)
 *   - 添加 leading-tight-cn / leading-relaxed-cn / tabular-nums 排版
 *   - 表格加 aria-label + <th scope="col">
 *   - "待处理" 提示加 role="status"
 *   - 支付金额用 formatYuanCompact (万元单位) 适配 dashboard 大数字
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
}

interface AffiliateRow {
  id: string;
  display_name: string | null;
  ref_code: string | null;
  status: string;
  total_earned_cents: number;
  available_cents: number;
  applied_at: string;
}

interface WithdrawalRow {
  id: string;
  blogger_id: string;
  amount_cents: number;
  contact_method: string;
  status: string;
  requested_at: string;
  blogger_display_name?: string;
}

async function loadStats() {
  if (!supabaseAdmin) return null;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  const [
    { count: todayOrders },
    { data: todayPaid },
    { count: pendingOrders },
    { data: recentOrders },
    { count: errorOrders },
    { count: pendingBloggers },
    { count: approvedBloggers },
    { data: pendingWithdrawals },
    { data: pendingWithdrawalsList },
    { data: pendingBloggerList },
  ] = await Promise.all([
    supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabaseAdmin.from('orders').select('amount').eq('status', 'paid').gte('paid_at', todayStart),
    supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin
      .from('orders')
      .select('id, order_no, amount, plan, status, payment_channel, payment_method, paid_at, created_at, openid')
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lt('created_at', oneHourAgo),
    supabaseAdmin.from('bloggers').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('bloggers').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabaseAdmin.from('withdrawals').select('amount_cents').eq('status', 'pending'),
    supabaseAdmin
      .from('withdrawals')
      .select('id, blogger_id, amount_cents, contact_method, status, requested_at')
      .eq('status', 'pending')
      .order('requested_at', { ascending: true })
      .limit(5),
    supabaseAdmin
      .from('bloggers')
      .select('id, display_name, ref_code, status, total_earned_cents, available_cents, applied_at')
      .eq('status', 'pending')
      .order('applied_at', { ascending: true })
      .limit(5),
  ]);

  const todayGmvCents = (todayPaid || []).reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const pendingWithdrawTotal = (pendingWithdrawals || []).reduce((s, w) => s + w.amount_cents, 0);

  // 关联博主名 (一笔 IO)
  const bloggerIds = Array.from(
    new Set([
      ...(pendingWithdrawalsList || []).map((w) => w.blogger_id),
      ...(pendingBloggerList || []).map((b) => b.id),
    ])
  );
  let bloggerMap = new Map<string, string>();
  if (bloggerIds.length > 0) {
    const { data: bloggers } = await supabaseAdmin
      .from('bloggers')
      .select('id, display_name')
      .in('id', bloggerIds);
    bloggerMap = new Map((bloggers || []).map((b: any) => [b.id, b.display_name || '-']));
  }

  return {
    today_orders: todayOrders || 0,
    today_gmv_cents: todayGmvCents,
    pending_orders: pendingOrders || 0,
    error_orders: errorOrders || 0,
    pending_bloggers: pendingBloggers || 0,
    approved_bloggers: approvedBloggers || 0,
    pending_withdraw_total_cents: pendingWithdrawTotal,
    pending_withdraw_count: (pendingWithdrawals || []).length,
    recent_orders: (recentOrders || []) as OrderRow[],
    pending_withdrawals: ((pendingWithdrawalsList || []) as WithdrawalRow[]).map((w) => ({
      ...w,
      blogger_display_name: bloggerMap.get(w.blogger_id) || '-',
    })),
    pending_blogger_list: (pendingBloggerList || []) as AffiliateRow[],
  };
}

export default async function AdminHomePage() {
  const auth = await requireAdmin();
  if (!auth.authenticated) {
    return <div className="leading-relaxed-cn">无权访问</div>;
  }

  const stats = await loadStats();

  if (!stats) {
    return (
      <div
        className="rounded-xl bg-amber-50 border border-amber-200 p-6 text-amber-900"
        role="status"
        aria-label="Supabase 未配置"
      >
        <p className="font-medium leading-tight-cn">Supabase 未配齐</p>
        <p className="text-sm mt-1 leading-relaxed-cn">
          请在 Vercel env 配置 NEXT_PUBLIC_SUPABASE_URL + SERVICE_ROLE_KEY
        </p>
      </div>
    );
  }

  const todoCount =
    stats.pending_bloggers + stats.pending_withdraw_count + stats.error_orders;

  return (
    <div className="space-y-6 pb-safe">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-slate-800 leading-tight-cn">
          <span aria-hidden>📊 </span>概览
        </h1>
        {todoCount > 0 && (
          <div
            className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg leading-tight-cn"
            role="status"
            aria-label={`您有 ${todoCount} 项待处理`}
          >
            <span aria-hidden>⚠️ </span>您有 <strong className="tabular-nums">{todoCount}</strong> 项待处理
          </div>
        )}
      </div>

      {/* 主指标 4 卡 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="今日订单"
          value={stats.today_orders}
          accent="blue"
          link="/admin/orders"
        />
        <StatCard
          label="今日 GMV"
          value={formatYuanCompact(stats.today_gmv_cents)}
          accent="emerald"
          link="/admin/orders?status=paid"
        />
        <StatCard
          label="待支付"
          value={stats.pending_orders}
          accent="amber"
          link="/admin/orders?status=pending"
        />
        <StatCard
          label="异常 (pending>1h)"
          value={stats.error_orders}
          accent={stats.error_orders > 0 ? 'red' : 'slate'}
          link="/admin/orders?status=pending&overdue=1"
        />
      </div>

      {/* 博主 + 提现 指标 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="待审核博主"
          value={stats.pending_bloggers}
          accent={stats.pending_bloggers > 0 ? 'pink' : 'slate'}
          link="/admin/affiliates?status=pending"
        />
        <StatCard
          label="已通过博主"
          value={stats.approved_bloggers}
          accent="slate"
          link="/admin/affiliates?status=approved"
        />
        <StatCard
          label="待打款 (提现)"
          value={formatYuanCompact(stats.pending_withdraw_total_cents)}
          subValue={`${stats.pending_withdraw_count} 笔待审批`}
          accent={stats.pending_withdraw_count > 0 ? 'amber' : 'slate'}
          link="/admin/withdrawals?status=pending"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 待办: 待审核博主 */}
        {stats.pending_bloggers > 0 && (
          <section aria-labelledby="pending-bloggers-title">
            <div className="flex items-center justify-between mb-3">
              <h2
                id="pending-bloggers-title"
                className="text-base font-bold text-slate-800 leading-tight-cn"
              >
                <span aria-hidden>🎁 </span>待审核博主 ({stats.pending_blogger_list.length})
              </h2>
              <Link
                href="/admin/affiliates?status=pending"
                className="text-xs text-amber-600 hover:underline focus-ring-visible"
              >
                全部 →
              </Link>
            </div>
            <div className="rounded-xl bg-white shadow-sm divide-y divide-slate-100">
              {stats.pending_blogger_list.map((b) => (
                <Link
                  key={b.id}
                  href="/admin/affiliates?status=pending"
                  className="block px-4 py-3 hover:bg-slate-50 focus-ring-visible"
                  aria-label={`审核博主: ${b.display_name || '匿名'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800 text-sm leading-tight-cn">
                        {b.display_name || '(匿名)'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 leading-relaxed-cn">
                        {timeAgo(b.applied_at)}
                      </div>
                    </div>
                    <span className="text-xs text-amber-600">审核 →</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 待办: 待审批提现 */}
        {stats.pending_withdraw_count > 0 && (
          <section aria-labelledby="pending-withdrawals-title">
            <div className="flex items-center justify-between mb-3">
              <h2
                id="pending-withdrawals-title"
                className="text-base font-bold text-slate-800 leading-tight-cn"
              >
                <span aria-hidden>💸 </span>待审批提现 ({stats.pending_withdrawals.length})
              </h2>
              <Link
                href="/admin/withdrawals?status=pending"
                className="text-xs text-amber-600 hover:underline focus-ring-visible"
              >
                全部 →
              </Link>
            </div>
            <div className="rounded-xl bg-white shadow-sm divide-y divide-slate-100">
              {stats.pending_withdrawals.map((w) => (
                <Link
                  key={w.id}
                  href="/admin/withdrawals?status=pending"
                  className="block px-4 py-3 hover:bg-slate-50 focus-ring-visible"
                  aria-label={`审批提现: ${w.blogger_display_name} ${formatYuan(w.amount_cents)}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-800 text-sm truncate leading-tight-cn">
                        {w.blogger_display_name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 leading-relaxed-cn">
                        {WITHDRAWAL_METHOD_LABEL[w.contact_method] || w.contact_method}
                        {' · '}
                        {timeAgo(w.requested_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-amber-600 tabular-nums">
                        {formatYuan(w.amount_cents)}
                      </div>
                      <div className="text-xs text-amber-600">审批 →</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* 最近 10 单 */}
      <section aria-labelledby="recent-orders-title">
        <div className="flex items-center justify-between mb-3">
          <h2
            id="recent-orders-title"
            className="text-lg font-bold text-slate-800 leading-tight-cn"
          >
            最近 10 单
          </h2>
          <Link
            href="/admin/orders"
            className="text-sm text-amber-600 hover:underline focus-ring-visible"
          >
            查看全部 →
          </Link>
        </div>
        <div className="rounded-xl bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm" aria-label="最近 10 个订单">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th scope="col" className="px-4 py-2 text-left">订单号</th>
                <th scope="col" className="px-4 py-2 text-left">套餐</th>
                <th scope="col" className="px-4 py-2 text-right">金额</th>
                <th scope="col" className="px-4 py-2 text-left">状态</th>
                <th scope="col" className="px-4 py-2 text-left">渠道</th>
                <th scope="col" className="px-4 py-2 text-right">创建时间</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 leading-relaxed-cn">
                    暂无订单
                  </td>
                </tr>
              ) : (
                stats.recent_orders.map((o) => (
                  <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-xs tabular-nums">{o.order_no}</td>
                    <td className="px-4 py-2">
                      <PlanBadge plan={o.plan} />
                    </td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums">
                      {formatYuan(o.amount)}
                    </td>
                    <td className="px-4 py-2">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500 leading-tight-cn">
                      {o.payment_channel || '-'}
                      {o.payment_method ? ` · ${o.payment_method}` : ''}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-slate-500 tabular-nums">
                      {timeAgo(o.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
