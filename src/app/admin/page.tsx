import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * /admin 概览页
 *
 * 显示 4 个指标卡 (今日订单 / 今日 GMV / 待支付 / 异常) + 最近 10 单
 * 数据从 supabase 直查 (避免 round trip 额外 API)
 */

export const dynamic = 'force-dynamic'; // 不缓存, 实时数据

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
  ]);

  const todayGmvCents = (todayPaid || []).reduce((s, o) => s + (Number(o.amount) || 0), 0);
  return {
    today_orders: todayOrders || 0,
    today_gmv_cents: todayGmvCents,
    today_gmv_yuan: (todayGmvCents / 100).toFixed(2),
    pending_orders: pendingOrders || 0,
    error_orders: errorOrders || 0,
    recent_orders: (recentOrders || []) as OrderRow[],
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
  const d = Math.floor(h / 24);
  return `${d}天前`;
}

export default async function AdminHomePage() {
  // 鉴权 (layout 已做, 这里再校验一次, 防止 layout 失效)
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">📊 概览</h1>

      {/* 4 指标卡 */}
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

function StatCard({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-900 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    amber: 'bg-amber-50 text-amber-900 border-amber-200',
    red: 'bg-red-50 text-red-900 border-red-200',
    slate: 'bg-slate-50 text-slate-900 border-slate-200',
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[accent] || colorMap.slate}`}>
      <p className="text-xs font-medium opacity-80 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
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
