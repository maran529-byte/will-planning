'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  withdrawalId: string;
  amount: number;
  displayName: string;
  mode: 'review' | 'pay';
}

function formatYuan(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`;
}

export function WithdrawalActionButtons({ withdrawalId, amount, displayName, mode }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const submit = async (
    decision: 'approved' | 'paid' | 'rejected',
    processNote?: string
  ) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/affiliates/withdraw/${withdrawalId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, process_note: processNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`操作失败: ${data.error || '未知错误'}`);
        return;
      }
      const labels = { approved: '已审批, 待打款', paid: '已标记打款完成', rejected: '已拒绝' };
      alert(labels[decision]);
      router.refresh();
    } catch (err) {
      alert(`网络错误: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'review') {
    const handleApprove = () => submit('approved');
    const handleReject = () => {
      const note = prompt(`拒绝 ${displayName} 的提现申请 ${formatYuan(amount)}, 请填写理由 (必填):`);
      if (!note || note.trim().length < 1) return;
      submit('rejected', note.trim());
    };
    return (
      <div className="flex gap-1 justify-end">
        <button
          type="button"
          onClick={handleApprove}
          disabled={busy}
          className="text-xs px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white"
        >
          审批通过
        </button>
        <button
          type="button"
          onClick={handleReject}
          disabled={busy}
          className="text-xs px-2.5 py-1 rounded bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white"
        >
          拒绝
        </button>
      </div>
    );
  }

  // mode === 'pay': 标记已打款
  const handlePay = () => {
    const note = prompt(
      `标记 ${displayName} 的提现 ${formatYuan(amount)} 为已打款\n\n请填写打款流水号 / 备注 (必填):`
    );
    if (!note || note.trim().length < 1) return;
    submit('paid', note.trim());
  };
  return (
    <button
      type="button"
      onClick={handlePay}
      disabled={busy}
      className="text-xs px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white"
    >
      标记已打款
    </button>
  );
}
