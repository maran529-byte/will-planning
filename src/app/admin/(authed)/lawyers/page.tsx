import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase-server';
import { timeUntil, BookingStatusBadge } from '@/lib/admin-helpers';
import { BrandLogo } from '@/components/BrandLogo';

/**
 * /admin/lawyers 专业资产规划人员预约管理
 *
 * 改版 v2 (2026-06-09):
 *   - 改用 @/lib/admin-helpers 共享 timeUntil / BookingStatusBadge
 *   - 删除本地 timeAgo / BookingStatusBadge (重复代码)
 *   - timeAgo 改名为 timeUntil - 预约场景下"5分钟后"比"5分钟前"更准
 *     (admin 是看未来时间, 不是过去时间)
 *   - 添加 leading-tight-cn / leading-relaxed-cn / tabular-nums
 *   - 表格加 aria-label + <th scope="col">
 *   - 表单 label 用 htmlFor 关联
 *   - 添加 pb-safe
 */

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

export default async function AdminLawyersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const bookings = await loadBookings(sp.status);

  return (
    <div className="space-y-4 pb-safe">
      <h1 className="text-2xl font-bold text-slate-800 leading-tight-cn inline-flex items-center gap-2">
        <BrandLogo size="sm" />
        <span>专业资产规划人员预约 (<span className="tabular-nums">{bookings.length}</span>)</span>
      </h1>

      <form
        className="bg-white rounded-xl shadow-sm p-4 flex items-end gap-3"
        aria-label="专业资产规划人员预约过滤"
      >
        <div>
          <label
            htmlFor="lawyer-status"
            className="block text-xs text-slate-600 mb-1 leading-tight-cn"
          >
            状态
          </label>
          <select
            id="lawyer-status"
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
        <button
          type="submit"
          className="rounded bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 text-sm font-medium focus-ring-visible leading-tight-cn"
        >
          过滤
        </button>
        {sp.status && (
          <Link
            href="/admin/lawyers"
            className="text-sm text-slate-500 hover:text-slate-700 focus-ring-visible"
          >
            清除
          </Link>
        )}
      </form>

      <div className="rounded-xl bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]" aria-label="专业资产规划人员预约列表">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th scope="col" className="px-4 py-2 text-left">专业资产规划人员</th>
              <th scope="col" className="px-4 py-2 text-left">联系人</th>
              <th scope="col" className="px-4 py-2 text-left">手机</th>
              <th scope="col" className="px-4 py-2 text-left">预约时间</th>
              <th scope="col" className="px-4 py-2 text-left">时长</th>
              <th scope="col" className="px-4 py-2 text-left">状态</th>
              <th scope="col" className="px-4 py-2 text-left">备注</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-slate-400 leading-relaxed-cn"
                >
                  暂无预约
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium leading-tight-cn">{b.lawyer_name}</td>
                  <td className="px-4 py-2 leading-tight-cn">{b.contact_name}</td>
                  <td className="px-4 py-2 font-mono text-xs tabular-nums">{b.contact_phone}</td>
                  <td className="px-4 py-2 text-xs tabular-nums">
                    {new Date(b.scheduled_at).toLocaleString('zh-CN')}
                    <span className="text-slate-400 ml-1">({timeUntil(b.scheduled_at)})</span>
                  </td>
                  <td className="px-4 py-2 text-xs tabular-nums">{b.duration_minutes} 分钟</td>
                  <td className="px-4 py-2">
                    <BookingStatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500 max-w-[200px] truncate leading-tight-cn">
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
