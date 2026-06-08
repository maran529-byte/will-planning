import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface BookingRow {
  id: string;
  user_id: string;
  order_id: string | null;
  lawyer_id: string;
  lawyer_name: string;
  scheduled_at: string;
  duration_minutes: number;
  contact_phone: string;
  contact_name: string;
  notes: string | null;
  status: string;
  meeting_url: string | null;
  created_at: string;
}

async function loadBookings(status?: string) {
  if (!supabaseAdmin) return [];
  let query = supabaseAdmin
    .from('lawyer_bookings')
    .select('id, user_id, order_id, lawyer_id, lawyer_name, scheduled_at, duration_minutes, contact_phone, contact_name, notes, status, meeting_url, created_at');
  if (status) query = query.eq('status', status);
  query = query.order('scheduled_at', { ascending: true }).range(0, 99);
  const { data } = await query;
  return (data || []) as BookingRow[];
}

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待确认' },
  { value: 'confirmed', label: '已确认' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
  { value: 'no_show', label: '客户未到场' },
];

function timeAgo(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) {
    const past = Date.now() - new Date(iso).getTime();
    const m = Math.floor(past / 60000);
    if (m < 60) return `${m}分钟前`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}小时前`;
    return `${Math.floor(h / 24)}天前`;
  }
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}分钟后`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时后`;
  return `${Math.floor(h / 24)}天后`;
}

export default async function AdminLawyersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const bookings = await loadBookings(sp.status);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">⚖️ 律师预约 ({bookings.length})</h1>

      <form className="bg-white rounded-xl shadow-sm p-4 flex items-end gap-3">
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
        <button
          type="submit"
          className="rounded bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 text-sm font-medium"
        >
          过滤
        </button>
        {sp.status && (
          <Link href="/admin/lawyers" className="text-sm text-slate-500 hover:text-slate-700">
            清除
          </Link>
        )}
      </form>

      <div className="rounded-xl bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-2 text-left">律师</th>
              <th className="px-4 py-2 text-left">联系人</th>
              <th className="px-4 py-2 text-left">手机</th>
              <th className="px-4 py-2 text-left">预约时间</th>
              <th className="px-4 py-2 text-left">时长</th>
              <th className="px-4 py-2 text-left">状态</th>
              <th className="px-4 py-2 text-left">备注</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  暂无预约
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium">{b.lawyer_name}</td>
                  <td className="px-4 py-2">{b.contact_name}</td>
                  <td className="px-4 py-2 font-mono text-xs">{b.contact_phone}</td>
                  <td className="px-4 py-2 text-xs">
                    {new Date(b.scheduled_at).toLocaleString('zh-CN')}
                    <span className="text-slate-400 ml-1">({timeAgo(b.scheduled_at)})</span>
                  </td>
                  <td className="px-4 py-2 text-xs">{b.duration_minutes} 分钟</td>
                  <td className="px-4 py-2">
                    <BookingStatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500 max-w-[200px] truncate">
                    {b.notes || '-'}
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

function BookingStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: '待确认', cls: 'bg-amber-100 text-amber-700' },
    confirmed: { label: '已确认', cls: 'bg-blue-100 text-blue-700' },
    completed: { label: '已完成', cls: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: '已取消', cls: 'bg-slate-100 text-slate-600' },
    no_show: { label: '未到场', cls: 'bg-red-100 text-red-700' },
  };
  const m = map[status] || { label: status, cls: 'bg-slate-100 text-slate-600' };
  return <span className={`text-xs px-2 py-0.5 rounded ${m.cls}`}>{m.label}</span>;
}
