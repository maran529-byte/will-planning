'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  orderId: string;
  status: string;
  paymentMethod: string | null;
}

export function OrderActionButtons({ orderId, status, paymentMethod }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleMarkPaid = async () => {
    if (!confirm('确认该订单已收款? 此操作不可撤销。')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: paymentMethod || 'wechat_personal' }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`操作失败: ${data.error || '未知错误'}`);
        return;
      }
      alert('已标记为已支付');
      router.refresh();
    } catch (err) {
      alert(`网络错误: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
      setBusy(false);
    }
  };

  const handleRefund = async () => {
    const reason = prompt('退款原因:');
    if (!reason || reason.trim().length < 1) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`退款失败: ${data.error || '未知错误'}`);
        return;
      }
      alert('已退款');
      router.refresh();
    } catch (err) {
      alert(`网络错误: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
      setBusy(false);
    }
  };

  if (status === 'pending') {
    return (
      <button
        type="button"
        onClick={handleMarkPaid}
        disabled={busy}
        className="text-xs px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white"
      >
        标记已支付
      </button>
    );
  }

  if (status === 'paid') {
    return (
      <button
        type="button"
        onClick={handleRefund}
        disabled={busy}
        className="text-xs px-2 py-1 rounded bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white"
      >
        退款
      </button>
    );
  }

  return <span className="text-xs text-slate-400">-</span>;
}
