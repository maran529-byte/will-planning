'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  bloggerId: string;
  displayName: string;
}

export function AffiliateActionButtons({ bloggerId, displayName }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleReview = async (decision: 'approved' | 'rejected') => {
    if (decision === 'rejected') {
      const note = prompt(`拒绝 ${displayName} 的申请, 请填写理由 (必填):`);
      if (!note || note.trim().length < 1) return;
      await submit(decision, undefined, note.trim());
    } else {
      const rateInput = prompt(
        `通过 ${displayName} 的申请\n\n输入佣金比例 (%, 默认 10%):`,
        '10'
      );
      if (rateInput === null) return;
      const rate = parseFloat(rateInput);
      if (isNaN(rate) || rate < 0 || rate > 50) {
        alert('佣金比例必须是 0-50 之间的数字');
        return;
      }
      await submit(decision, Math.round(rate * 100), undefined);
    }
  };

  const submit = async (
    decision: 'approved' | 'rejected',
    commissionRate?: number,
    reviewNote?: string
  ) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/affiliates/${bloggerId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          commission_rate: commissionRate,
          review_note: reviewNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`审核失败: ${data.error || '未知错误'}`);
        return;
      }
      alert(decision === 'approved' ? '已通过, 推广码已生成' : '已拒绝');
      router.refresh();
    } catch (err) {
      alert(`网络错误: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex gap-1 justify-end">
      <button
        type="button"
        onClick={() => handleReview('approved')}
        disabled={busy}
        className="text-xs px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white"
      >
        通过
      </button>
      <button
        type="button"
        onClick={() => handleReview('rejected')}
        disabled={busy}
        className="text-xs px-2.5 py-1 rounded bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white"
      >
        拒绝
      </button>
    </div>
  );
}
