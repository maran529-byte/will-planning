import { supabaseAdmin } from '@/lib/supabase-server';
import { listWithdrawals, listBloggers, type WithdrawalStatus } from '@/lib/affiliate';
import { WithdrawalActionButtons } from './WithdrawalActionButtons';

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

const METHOD_LABEL: Record<string, string> = {
  alipay: '支付宝',
  wechat: '微信',
  bank: '银行卡',
};

export default async function AdminWithdrawalsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const status = (sp.status as WithdrawalStatus) || undefined;
  const withdrawals = await loadWithdrawals(status);

  // 统计当前待审批总金额
  const pendingTotal = withdrawals
    .filter((w) => w.status === 'pending')
    .reduce((sum, w) => sum + w.amount_cents, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">
        💳 提现审批 ({withdrawals.length})
        {status === 'pending' && pendingTotal > 0 && (
          <span className="text-base text-amber-600 ml-2">
            待打款: {formatYuan(pendingTotal)}
          </span>
        )}
      </h1>

      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900">
        <p className="font-medium mb-1">审批流程</p>
        <p>pending → 管理员审批 (approved) → 线下打款 → 标记 paid (扣博主余额, 佣金 → withdrawn)</p>
        <p className="mt-1">拒绝时必须填写理由, 余额不扣, 佣金保持 available。</p>
      </div>

      <form className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-slate-600 mb-1">状态</label>
          <div className="flex gap-1">
            {STATUS_OPTIONS.map((o) => (
              <a
                key={o.value}
                href={o.value ? `/admin/withdrawals?status=${o.value}` : '/admin/withdrawals'}
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
        <table className="w-full text-sm min-w-[1000px]">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-2 text-left">博主</th>
              <th className="px-4 py-2 text-right">金额</th>
              <th className="px-4 py-2 text-left">方式 / 账号</th>
              <th className="px-4 py-2 text-left">状态</th>
              <th className="px-4 py-2 text-left">备注</th>
              <th className="px-4 py-2 text-right">申请时间</th>
              <th className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  暂无提现申请
                </td>
              </tr>
            ) : (
              withdrawals.map((w) => (
                <tr key={w.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <div className="font-medium text-slate-800">{w.blogger_display_name || '-'}</div>
                    {w.blogger_ref_code && (
                      <code className="text-xs font-mono text-amber-700">{w.blogger_ref_code}</code>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold">{formatYuan(w.amount_cents)}</td>
                  <td className="px-4 py-2">
                    <div className="text-xs text-slate-600">{METHOD_LABEL[w.contact_method] || w.contact_method}</div>
                    <div className="font-mono text-xs text-slate-500 mt-0.5">{w.contact_info}</div>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={w.status} />
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500 max-w-[200px] truncate">
                    {w.process_note || '-'}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-slate-500">
                    <div>{timeAgo(w.requested_at)}</div>
                    {w.processed_at && (
                      <div className="text-slate-400">处理: {timeAgo(w.processed_at)}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {w.status === 'pending' && (
                      <WithdrawalActionButtons withdrawalId={w.id} amount={w.amount_cents} displayName={w.blogger_display_name || '博主'} mode="review" />
                    )}
                    {w.status === 'approved' && (
                      <WithdrawalActionButtons withdrawalId={w.id} amount={w.amount_cents} displayName={w.blogger_display_name || '博主'} mode="pay" />
                    )}
                    {(w.status === 'paid' || w.status === 'rejected' || w.status === 'cancelled') && (
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
    pending: { label: '待审批', cls: 'bg-amber-100 text-amber-700' },
    approved: { label: '已审批', cls: 'bg-blue-100 text-blue-700' },
    paid: { label: '✅ 已打款', cls: 'bg-emerald-100 text-emerald-700' },
    rejected: { label: '已拒绝', cls: 'bg-red-100 text-red-700' },
    cancelled: { label: '已撤销', cls: 'bg-slate-100 text-slate-600' },
  };
  const m = map[status] || { label: status, cls: 'bg-slate-100 text-slate-600' };
  return <span className={`text-xs px-2 py-0.5 rounded ${m.cls}`}>{m.label}</span>;
}
