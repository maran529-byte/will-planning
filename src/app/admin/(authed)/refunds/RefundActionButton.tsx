'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatYuan } from '@/lib/admin-helpers';

interface Props {
  orderId: string;
  orderNo: string;
  amount: number;
}

/**
 * RefundActionButton - 退款行内确认
 *
 * 改版 v2 (2026-06-09):
 *   - 删除 prompt() / alert() - 改用 inline 状态机
 *   - 显示订单号 + 金额 (用 formatYuan 共享函数)
 *   - 添加 aria-label / aria-busy / focus-ring-visible
 *   - 添加 leading-tight-cn
 */
export function RefundActionButton({ orderId, orderNo, amount }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setConfirming(false);
    setReason('');
    setError(null);
  };

  const handleRefund = async () => {
    if (reason.trim().length < 1) {
      setError('请填写退款原因');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '未知错误');
        return;
      }
      reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setBusy(false);
    }
  };

  if (confirming) {
    return (
      <div
        className="flex flex-col items-end gap-1.5 min-w-[220px]"
        role="group"
        aria-label={`退款确认: ${orderNo}`}
      >
        <div className="text-xs text-slate-500 leading-tight-cn self-start">
          订单 <span className="font-mono tabular-nums">{orderNo}</span> · 退款{' '}
          <span className="font-semibold tabular-nums">{formatYuan(amount)}</span>
        </div>
        <label htmlFor={`refund-reason-${orderId}`} className="sr-only">
          退款原因
        </label>
        <input
          id={`refund-reason-${orderId}`}
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="退款原因 (必填)"
          // 改版 v2: 16px 防 iOS 自动放大
          style={{ fontSize: '16px' }}
          disabled={busy}
          className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus-ring-visible"
          aria-describedby={error ? `refund-err-${orderId}` : undefined}
        />
        {error && (
          <p
            id={`refund-err-${orderId}`}
            className="text-xs text-red-600 leading-tight-cn self-start"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={handleRefund}
            disabled={busy || reason.trim().length < 1}
            aria-busy={busy}
            className="text-xs px-2 py-1 rounded bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white focus-ring-visible leading-tight-cn"
          >
            {busy ? '处理中…' : '确认退款'}
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={busy}
            className="text-xs px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 focus-ring-visible leading-tight-cn"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      disabled={busy}
      aria-busy={busy}
      aria-label={`对订单 ${orderNo} 发起退款, 金额 ${formatYuan(amount)}`}
      className="text-xs px-3 py-1.5 rounded bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white focus-ring-visible leading-tight-cn"
    >
      退款
    </button>
  );
}
