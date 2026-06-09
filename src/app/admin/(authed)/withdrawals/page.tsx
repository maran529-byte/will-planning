import { supabaseAdmin } from '@/lib/supabase-server';
import { listWithdrawals, type WithdrawalStatus } from '@/lib/affiliate';
import {
  timeAgo,
  formatYuan,
  WithdrawalStatusBadge,
  WITHDRAWAL_METHOD_LABEL,
} from '@/lib/admin-helpers';
import { WithdrawalActionButtons } from './WithdrawalActionButtons';

/**
 * /admin/withdrawals 提现审批
 *
 * 改版 v2 (2026-06-09):
 *   - 改用 @/lib/admin-helpers 共享 timeAgo / formatYuan / WithdrawalStatusBadge
 *     / WITHDRAWAL_METHOD_LABEL
 *   - 删除本地 timeAgo / formatYuan / StatusBadge / METHOD_LABEL (重复代码)
 *   - 添加 leading-tight-cn / leading-relaxed-cn / tabular-nums
 *   - 提示框加 role="status" + aria-label
 *   - 状态过滤 tab 加 aria-current
 *   - 表格加 aria-label + <th scope="col">
 *   - 推广码 code 元素加 aria-label
 *   - 添加 pb-safe
 */

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

interface WithdrawalWithBlogger {
  id: string;
  blogger_id: string;
  amount_cents: number;
  commission_ids: string[];
  contact_method: 'alipay' | 'wechat' | 'bank';
  contact_info: string;
  status: WithdrawalStatus;
  requested_at: string;
  processed_at: string | null;
  process_note: string | null;
  payment_proof_url: string | null;
  blogger_display_name?: string;
  blogger_ref_code?: string;
}

async function loadWithdrawals(status?: WithdrawalStatus): Promise<WithdrawalWithBlogger[]> {
  if (!supabaseAdmin) return [];
  const { withdrawals } = await listWithdrawals({ status, limit: 100 });
  if (withdrawals.length === 0) return [];

  // 查博主显示名 + 推广码
  const bloggerIds = Array.from(new Set(withdrawals.map((w) => w.blogger_id)));
  const { data: bloggers } = await supabaseAdmin
    .from('bloggers')
    .select('id, display_name, ref_code')
    .in('id', bloggerIds);
  const bloggerMap = new Map((bloggers || []).map((b: any) => [b.id, b]));

  return withdrawals.map((w) => {
    const b = bloggerMap.get(w.blogger_id) as any;
    return {
      ...w,
      blogger_display_name: b?.display_name,
      blogger_ref_code: b?.ref_code,
    };
  });
}

const STATUS_OPTIONS: Array<{ value: '' | WithdrawalStatus; label: string }> = [
  { value: '', label: '全部' },
  { value: 'pending', label: '⏳ 待审批' },
  { value: 'approved', label: '✓ 已审批' },
  { value: 'paid', label: '💸 已打款' },
  { value: 'rejected', label: '❌ 已拒绝' },
];

export default async function AdminWithdrawalsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const status = (sp.status as WithdrawalStatus) || undefined;
  const withdrawals = await loadWithdrawals(status);
  const currentStatus = sp.status || '';

  // 统计当前待审批总金额
  const pendingTotal = withdrawals
    .filter((w) => w.status === 'pending')
    .reduce((sum, w) => sum + w.amount_cents, 0);

  return (
    <div className="space-y-4 pb-safe">
      <h1 className="text-2xl font-bold text-slate-800 leading-tight-cn">
        <span aria-hidden>💳 </span>提现审批 (
        <span className="tabular-nums">{withdrawals.length}</span>)
        {status === 'pending' && pendingTotal > 0 && (
          <span
            className="text-base text-amber-600 ml-2 tabular-nums"
            aria-label={`待打款总额 ${formatYuan(pendingTotal)}`}
          >
            待打款: {formatYuan(pendingTotal)}
          </span>
        )}
      </h1>

      <div
        className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900 leading-relaxed-cn"
        role="status"
        aria-label="审批流程说明"
      >
        <p className="font-medium mb-1 leading-tight-cn">审批流程</p>
        <p>pending → 管理员审批 (approved) → 线下打款 → 标记 paid (扣博主余额, 佣金 → withdrawn)</p>
        <p className="mt-1">拒绝时必须填写理由, 余额不扣, 佣金保持 available。</p>
      </div>

      <form
        className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-end gap-3"
        aria-label="提现状态过滤"
      >
        <div>
          <span className="block text-xs text-slate-600 mb-1 leading-tight-cn">状态</span>
          <div className="flex gap-1" role="tablist" aria-label="提现状态">
            {STATUS_OPTIONS.map((o) => {
              const isActive = currentStatus === o.value;
              return (
                <a
                  key={o.value}
                  href={o.value ? `/admin/withdrawals?status=${o.value}` : '/admin/withdrawals'}
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
        <table className="w-full text-sm min-w-[1000px]" aria-label="提现申请列表">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th scope="col" className="px-4 py-2 text-left">博主</th>
              <th scope="col" className="px-4 py-2 text-right">金额</th>
              <th scope="col" className="px-4 py-2 text-left">方式 / 账号</th>
              <th scope="col" className="px-4 py-2 text-left">状态</th>
              <th scope="col" className="px-4 py-2 text-left">备注</th>
              <th scope="col" className="px-4 py-2 text-right">申请时间</th>
              <th scope="col" className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-slate-400 leading-relaxed-cn"
                >
                  暂无提现申请
                </td>
              </tr>
            ) : (
              withdrawals.map((w) => (
                <tr key={w.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <div className="font-medium text-slate-800 leading-tight-cn">
                      {w.blogger_display_name || '-'}
                    </div>
                    {w.blogger_ref_code && (
                      <code
                        className="text-xs font-mono text-amber-700 tabular-nums"
                        aria-label={`推广码 ${w.blogger_ref_code}`}
                      >
                        {w.blogger_ref_code}
                      </code>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold tabular-nums">
                    {formatYuan(w.amount_cents)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="text-xs text-slate-600 leading-tight-cn">
                      {WITHDRAWAL_METHOD_LABEL[w.contact_method] || w.contact_method}
                    </div>
                    <div className="font-mono text-xs text-slate-500 mt-0.5 tabular-nums">
                      {w.contact_info}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <WithdrawalStatusBadge status={w.status} />
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500 max-w-[200px] truncate leading-tight-cn">
                    {w.process_note || '-'}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-slate-500 tabular-nums">
                    <div>{timeAgo(w.requested_at)}</div>
                    {w.processed_at && (
                      <div className="text-slate-400">处理: {timeAgo(w.processed_at)}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {w.status === 'pending' && (
                      <WithdrawalActionButtons
                        withdrawalId={w.id}
                        amount={w.amount_cents}
                        displayName={w.blogger_display_name || '博主'}
                        mode="review"
                      />
                    )}
                    {w.status === 'approved' && (
                      <WithdrawalActionButtons
                        withdrawalId={w.id}
                        amount={w.amount_cents}
                        displayName={w.blogger_display_name || '博主'}
                        mode="pay"
                      />
                    )}
                    {(w.status === 'paid' || w.status === 'rejected' || w.status === 'cancelled') && (
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
