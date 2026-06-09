'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  orderId: string;
  status: string;
  paymentMethod: string | null;
}

/**
 * OrderActionButtons - 订单行操作按钮
 *
 * 改版 v2 (2026-06-09):
 *   - 删除 confirm() / prompt() / alert() - 改用 inline 状态机 (无障碍 / UX 更优)
 *   - 添加 aria-label (订单号无关 → 用业务动作描述)
 *   - 添加 focus-ring-visible
 *   - 添加 disabled 期间 aria-busy
 *   - 添加 leading-tight-cn
 *
 * 状态机:
 *   idle → confirm/refund → submit → done | error → idle
 */
export function OrderActionButtons({ orderId, status, paymentMethod }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<'paid' | 'refund' | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setConfirming(null);
    setReason('');
    setError(null);
  };

  const handleMarkPaid = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: paymentMethod || 'wechat_personal' }),
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

  // ============== 退款二次确认 (内联) ==============
  if (confirming === 'refund') {
    return (
      <div
        className="flex flex-col items-end gap-1.5 min-w-[200px]"
        role="group"
        aria-label="退款二次确认"
      >
        <label
          htmlFor={`refund-reason-${orderId}`}
          className="text-xs text-slate-500 leading-tight-cn self-start"
        >
          退款原因
        </label>
        <input
          id={`refund-reason-${orderId}`}
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="如: 客户主动取消"
          // 改版 v2: 16px 防 iOS 自动放大
          style={{ fontSize: '16px' }}
          disabled={busy}
          className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus-ring-visible"
          aria-describedby={error ? `refund-error-${orderId}` : undefined}
        />
        {error && (
          <p
            id={`refund-error-${orderId}`}
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

  // ============== 默认按钮 ==============
  return (
    <div
      className="flex flex-col items-end gap-1.5 min-w-[80px]"
      role="group"
      aria-label="订单操作"
    >
      {status === 'pending' && (
        <>
          <button
            type="button"
            onClick={() => setConfirming('paid')}
            disabled={busy}
            aria-busy={busy}
            aria-label="标记此订单为已支付"
            className="text-xs px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white focus-ring-visible leading-tight-cn"
          >
            标记已支付
          </button>
          {confirming === 'paid' && (
            <div
              className="flex flex-col items-end gap-1"
              role="dialog"
              aria-label="确认标记已支付"
            >
              <p className="text-xs text-slate-600 leading-tight-cn">
                确认该订单已收款?
              </p>
              {error && (
                <p className="text-xs text-red-600 leading-tight-cn" role="alert">
                  {error}
                </p>
              )}
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleMarkPaid}
                  disabled={busy}
                  aria-busy={busy}
                  className="text-xs px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white focus-ring-visible leading-tight-cn"
                >
                  {busy ? '处理中…' : '确认'}
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
          )}
        </>
      )}

      {status === 'paid' && (
        <button
          type="button"
          onClick={() => setConfirming('refund')}
          disabled={busy}
          aria-busy={busy}
          aria-label="对此订单发起退款"
          className="text-xs px-2 py-1 rounded bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white focus-ring-visible leading-tight-cn"
        >
          退款
        </button>
      )}

      {(status === 'refunded' || status === 'cancelled') && (
        <span className="text-xs text-slate-400 leading-tight-cn" aria-label="无操作">
          -
        </span>
      )}
    </div>
  );
}
