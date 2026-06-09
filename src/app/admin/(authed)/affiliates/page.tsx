import { supabaseAdmin } from '@/lib/supabase-server';
import { listBloggers, type BloggerStatus } from '@/lib/affiliate';
import {
  timeAgo,
  formatYuan,
  BloggerStatusBadge,
} from '@/lib/admin-helpers';
import { AffiliateActionButtons } from './AffiliateActionButtons';

/**
 * /admin/affiliates 博主管理
 *
 * 改版 v2 (2026-06-09):
 *   - 改用 @/lib/admin-helpers 共享 timeAgo / formatYuan / BloggerStatusBadge
 *   - 删除本地 timeAgo / formatYuan / StatusBadge (重复代码)
 *   - 添加 leading-tight-cn / leading-relaxed-cn / tabular-nums
 *   - 提示框加 role="status" + aria-label
 *   - 状态过滤 tab 改用 Link 组件 (而非 <a>) + aria-current
 *   - 表格加 aria-label + <th scope="col">
 *   - 推广码 code 元素加 aria-label
 *   - 添加 pb-safe
 */

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

async function loadBloggers(status?: BloggerStatus) {
  if (!supabaseAdmin) return { bloggers: [], total: 0 };
  return listBloggers({ status, limit: 100 });
}

const STATUS_OPTIONS: Array<{ value: '' | BloggerStatus; label: string }> = [
  { value: '', label: '全部' },
  { value: 'pending', label: '⏳ 待审核' },
  { value: 'approved', label: '✅ 已通过' },
  { value: 'rejected', label: '❌ 已拒绝' },
  { value: 'disabled', label: '🚫 已禁用' },
];

export default async function AdminAffiliatesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const status = (sp.status as BloggerStatus) || undefined;
  const { bloggers, total } = await loadBloggers(status);
  const currentStatus = sp.status || '';

  return (
    <div className="space-y-4 pb-safe">
      <h1 className="text-2xl font-bold text-slate-800 leading-tight-cn">
        <span aria-hidden>🎁 </span>博主管理 (
        <span className="tabular-nums">{total}</span>)
      </h1>

      <div
        className="rounded-xl bg-pink-50 border border-pink-200 p-4 text-sm text-pink-900 leading-relaxed-cn"
        role="status"
        aria-label="审核流程说明"
      >
        <p className="font-medium mb-1 leading-tight-cn">审核流程</p>
        <p>申请提交后, 状态为「待审核」。审核通过 → 自动生成推广码 (B + 6 字符)。</p>
        <p className="mt-1">
          拒绝时必须填写理由, 申请者可在 <code className="px-1.5 py-0.5 rounded bg-pink-100 text-xs">/affiliate</code> 查看。
        </p>
      </div>

      {/* 状态过滤 */}
      <form
        className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-end gap-3"
        aria-label="博主状态过滤"
      >
        <div>
          <span className="block text-xs text-slate-600 mb-1 leading-tight-cn">状态</span>
          <div className="flex gap-1" role="tablist" aria-label="博主状态">
            {STATUS_OPTIONS.map((o) => {
              const isActive = currentStatus === o.value;
              return (
                <a
                  key={o.value}
                  href={o.value ? `/admin/affiliates?status=${o.value}` : '/admin/affiliates'}
                  role="tab"
                  aria-selected={isActive}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-3 py-1.5 rounded text-sm focus-ring-visible leading-tight-cn ${
                    isActive
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {o.label}
                </a>
              );
            })}
          </div>
        </div>
      </form>

      <div className="rounded-xl bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]" aria-label="博主列表">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th scope="col" className="px-4 py-2 text-left">显示名</th>
              <th scope="col" className="px-4 py-2 text-left">联系手机</th>
              <th scope="col" className="px-4 py-2 text-left">推广码</th>
              <th scope="col" className="px-4 py-2 text-right">佣金比例</th>
              <th scope="col" className="px-4 py-2 text-right">累计/可提现/已提现</th>
              <th scope="col" className="px-4 py-2 text-left">状态</th>
              <th scope="col" className="px-4 py-2 text-right">申请时间</th>
              <th scope="col" className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {bloggers.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-slate-400 leading-relaxed-cn"
                >
                  暂无博主 (当前过滤条件下)
                </td>
              </tr>
            ) : (
              bloggers.map((b) => (
                <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <div className="font-medium leading-tight-cn">{b.display_name || '-'}</div>
                    {b.bio && (
                      <div className="text-xs text-slate-500 mt-0.5 max-w-[200px] truncate leading-relaxed-cn">
                        {b.bio}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs tabular-nums">
                    {b.contact_phone || '-'}
                  </td>
                  <td className="px-4 py-2">
                    {b.ref_code ? (
                      <code
                        className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-xs tabular-nums"
                        aria-label={`推广码 ${b.ref_code}`}
                      >
                        {b.ref_code}
                      </code>
                    ) : (
                      <span className="text-slate-300 text-xs" aria-label="无推广码">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-slate-600 tabular-nums">
                    {(b.commission_rate / 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-2 text-right text-xs font-mono">
                    <div className="text-slate-700 tabular-nums">{formatYuan(b.total_earned_cents)}</div>
                    <div className="text-emerald-600 tabular-nums">{formatYuan(b.available_cents)}</div>
                    <div className="text-blue-600 tabular-nums">{formatYuan(b.total_withdrawn_cents)}</div>
                  </td>
                  <td className="px-4 py-2">
                    <BloggerStatusBadge status={b.status} />
                    {b.review_note && (
                      <div
                        className="text-xs text-slate-500 mt-1 max-w-[200px] truncate leading-tight-cn"
                        title={b.review_note}
                      >
                        备注: {b.review_note}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-slate-500 tabular-nums">
                    <div>{timeAgo(b.applied_at)}</div>
                    {b.reviewed_at && (
                      <div className="text-slate-400">审核: {timeAgo(b.reviewed_at)}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {b.status === 'pending' ? (
                      <AffiliateActionButtons
                        bloggerId={b.id}
                        displayName={b.display_name || '博主'}
                      />
                    ) : (
                      <span className="text-xs text-slate-400" aria-label="无操作">-</span>
                    )}
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
