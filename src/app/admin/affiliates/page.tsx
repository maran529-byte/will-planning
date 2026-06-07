import { supabaseAdmin } from '@/lib/supabase-server';
import { listBloggers, type BloggerStatus } from '@/lib/affiliate';
import { AffiliateActionButtons } from './AffiliateActionButtons';

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

function timeAgo(iso: string | null): string {
  if (!iso) return '-';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  return `${Math.floor(h / 24)}天前`;
}

function formatYuan(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`;
}

export default async function AdminAffiliatesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const status = (sp.status as BloggerStatus) || undefined;
  const { bloggers, total } = await loadBloggers(status);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">🎁 博主管理 ({total})</h1>

      <div className="rounded-xl bg-pink-50 border border-pink-200 p-4 text-sm text-pink-900">
        <p className="font-medium mb-1">审核流程</p>
        <p>申请提交后, 状态为「待审核」。审核通过 → 自动生成推广码 (B + 6 字符)。</p>
        <p className="mt-1">拒绝时必须填写理由, 申请者可在 <code>/affiliate</code> 查看。</p>
      </div>

      {/* 状态过滤 */}
      <form className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-slate-600 mb-1">状态</label>
          <div className="flex gap-1">
            {STATUS_OPTIONS.map((o) => (
              <a
                key={o.value}
                href={o.value ? `/admin/affiliates?status=${o.value}` : '/admin/affiliates'}
                className={`px-3 py-1.5 rounded text-sm ${
                  (sp.status || '') === o.value
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {o.label}
              </a>
            ))}
          </div>
        </div>
      </form>

      <div className="rounded-xl bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-2 text-left">显示名</th>
              <th className="px-4 py-2 text-left">联系手机</th>
              <th className="px-4 py-2 text-left">推广码</th>
              <th className="px-4 py-2 text-right">佣金比例</th>
              <th className="px-4 py-2 text-right">累计/可提现/已提现</th>
              <th className="px-4 py-2 text-left">状态</th>
              <th className="px-4 py-2 text-right">申请时间</th>
              <th className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {bloggers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  暂无博主 (当前过滤条件下)
                </td>
              </tr>
            ) : (
              bloggers.map((b) => (
                <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <div className="font-medium">{b.display_name || '-'}</div>
                    {b.bio && <div className="text-xs text-slate-500 mt-0.5 max-w-[200px] truncate">{b.bio}</div>}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{b.contact_phone || '-'}</td>
                  <td className="px-4 py-2">
                    {b.ref_code ? (
                      <code className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-xs">
                        {b.ref_code}
                      </code>
                    ) : (
                      <span className="text-slate-300 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-slate-600">
                    {(b.commission_rate / 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-2 text-right text-xs font-mono">
                    <div className="text-slate-700">{formatYuan(b.total_earned_cents)}</div>
                    <div className="text-emerald-600">{formatYuan(b.available_cents)}</div>
                    <div className="text-blue-600">{formatYuan(b.total_withdrawn_cents)}</div>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={b.status} />
                    {b.review_note && (
                      <div className="text-xs text-slate-500 mt-1 max-w-[200px] truncate" title={b.review_note}>
                        备注: {b.review_note}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-slate-500">
                    <div>{timeAgo(b.applied_at)}</div>
                    {b.reviewed_at && (
                      <div className="text-slate-400">审核: {timeAgo(b.reviewed_at)}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {b.status === 'pending' ? (
                      <AffiliateActionButtons bloggerId={b.id} displayName={b.display_name || '博主'} />
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: '待审核', cls: 'bg-amber-100 text-amber-700' },
    approved: { label: '已通过', cls: 'bg-emerald-100 text-emerald-700' },
    rejected: { label: '已拒绝', cls: 'bg-red-100 text-red-700' },
    disabled: { label: '已禁用', cls: 'bg-slate-200 text-slate-600' },
  };
  const m = map[status] || { label: status, cls: 'bg-slate-100 text-slate-600' };
  return <span className={`text-xs px-2 py-0.5 rounded ${m.cls}`}>{m.label}</span>;
}
