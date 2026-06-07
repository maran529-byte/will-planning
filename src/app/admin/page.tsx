import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
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
  return `${Math.floor(h / 24)}天前`;
}

export default async function AdminHomePage() {
  const auth = await requireAdmin();
  if (!auth.authenticated) {
    return <div>无权访问</div>;
  }

  const stats = await loadStats();

  if (!stats) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-6 text-amber-900">
        <p className="font-medium">Supabase 未配齐</p>
        <p className="text-sm mt-1">请在 Vercel env 配置 NEXT_PUBLIC_SUPABASE_URL + SERVICE_ROLE_KEY</p>
      </div>
    );
  }

  const todoCount =
    stats.pending_bloggers + stats.pending_withdraw_count + stats.error_orders;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">📊 概览</h1>
        {todoCount > 0 && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
            ⚠️ 您有 <strong>{todoCount}</strong> 项待处理
          </div>
        )}
      </div>

      {/* 主指标 4 卡 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="今日订单" value={stats.today_orders} accent="blue" />
        <StatCard label="今日 GMV" value={formatYuan(stats.today_gmv_cents)} accent="emerald" />
        <StatCard label="待支付" value={stats.pending_orders} accent="amber" />
        <StatCard
          label="异常 (pending>1h)"
          value={stats.error_orders}
          accent={stats.error_orders > 0 ? 'red' : 'slate'}
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
          value={formatYuan(stats.pending_withdraw_total_cents)}
          subValue={`${stats.pending_withdraw_count} 笔待审批`}
          accent={stats.pending_withdraw_count > 0 ? 'amber' : 'slate'}
          link="/admin/withdrawals?status=pending"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 待办: 待审核博主 */}
        {stats.pending_bloggers > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-800">
                🎁 待审核博主 ({stats.pending_blogger_list.length})
              </h2>
              <Link href="/admin/affiliates?status=pending" className="text-xs text-amber-600 hover:underline">
                全部 →
              </Link>
            </div>
            <div className="rounded-xl bg-white shadow-sm divide-y divide-slate-100">
              {stats.pending_blogger_list.map((b) => (
                <Link
                  key={b.id}
                  href="/admin/affiliates?status=pending"
                  className="block px-4 py-3 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800 text-sm">{b.display_name || '(匿名)'}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{timeAgo(b.applied_at)}</div>
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
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-800">
                💸 待审批提现 ({stats.pending_withdrawals.length})
              </h2>
              <Link href="/admin/withdrawals?status=pending" className="text-xs text-amber-600 hover:underline">
                全部 →
              </Link>
            </div>
            <div className="rounded-xl bg-white shadow-sm divide-y divide-slate-100">
              {stats.pending_withdrawals.map((w) => (
                <Link
                  key={w.id}
                  href="/admin/withdrawals?status=pending"
                  className="block px-4 py-3 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-800 text-sm truncate">{w.blogger_display_name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {w.contact_method === 'alipay' ? '支付宝' : w.contact_method === 'wechat' ? '微信' : '银行卡'}
                        {' · '}
                        {timeAgo(w.requested_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-amber-600">{formatYuan(w.amount_cents)}</div>
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
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-800">最近 10 单</h2>
          <Link href="/admin/orders" className="text-sm text-amber-600 hover:underline">
            查看全部 →
          </Link>
        </div>
        <div className="rounded-xl bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left">订单号</th>
                <th className="px-4 py-2 text-left">套餐</th>
                <th className="px-4 py-2 text-right">金额</th>
                <th className="px-4 py-2 text-left">状态</th>
                <th className="px-4 py-2 text-left">渠道</th>
                <th className="px-4 py-2 text-right">创建时间</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    暂无订单
                  </td>
                </tr>
              ) : (
                stats.recent_orders.map((o) => (
                  <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-xs">{o.order_no}</td>
                    <td className="px-4 py-2">
                      <PlanBadge plan={o.plan} />
                    </td>
                    <td className="px-4 py-2 text-right font-semibold">
                      {formatYuan(o.amount)}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {o.payment_channel || '-'}
                      {o.payment_method ? ` · ${o.payment_method}` : ''}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-slate-500">
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

function StatCard({
  label,
  value,
  subValue,
  accent,
  link,
}: {
  label: string;
  value: number | string;
  subValue?: string;
  accent: string;
  link?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-900 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    amber: 'bg-amber-50 text-amber-900 border-amber-200',
    red: 'bg-red-50 text-red-900 border-red-200',
    pink: 'bg-pink-50 text-pink-900 border-pink-200',
    slate: 'bg-slate-50 text-slate-900 border-slate-200',
  };
  const cls = colorMap[accent] || colorMap.slate;
  const content = (
    <div className={`rounded-xl border p-4 ${cls} ${link ? 'hover:shadow-sm cursor-pointer transition' : ''}`}>
      <p className="text-xs font-medium opacity-80 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {subValue && <p className="text-xs opacity-70 mt-1">{subValue}</p>}
    </div>
  );
  return link ? <Link href={link}>{content}</Link> : content;
}

function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ai: { label: 'AI', cls: 'bg-slate-100 text-slate-700' },
    expert: { label: '专家', cls: 'bg-amber-100 text-amber-700' },
    lawyer: { label: '专家(旧)', cls: 'bg-amber-50 text-amber-600' },
    family: { label: '家族(下架)', cls: 'bg-slate-50 text-slate-500' },
  };
  const m = map[plan] || { label: plan, cls: 'bg-slate-100 text-slate-600' };
  return <span className={`text-xs px-2 py-0.5 rounded ${m.cls}`}>{m.label}</span>;
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
