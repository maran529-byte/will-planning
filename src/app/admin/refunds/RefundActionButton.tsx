'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  orderId: string;
  orderNo: string;
  amount: number;
}

export function RefundActionButton({ orderId, orderNo, amount }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleRefund = async () => {
    const reason = prompt(
      `退款订单 ${orderNo} (¥${(amount / 100).toFixed(2)})\n\n请输入退款原因 (必填):`
    );
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
      alert(`已退款 ${(amount / 100).toFixed(2)} 元`);
      router.refresh();
    } catch (err) {
      alert(`网络错误: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRefund}
      disabled={busy}
      className="text-xs px-3 py-1.5 rounded bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white"
    >
      {busy ? '处理中...' : '退款'}
    </button>
  );
}
