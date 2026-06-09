'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatYuan } from '@/lib/admin-helpers';

interface Props {
  withdrawalId: string;
  amount: number;
  displayName: string;
  mode: 'review' | 'pay';
}

type Decision = 'approved' | 'paid' | 'rejected';

/**
 * WithdrawalActionButtons - 提现审批/打款
 *
 * 改版 v2 (2026-06-09):
 *   - 删除 prompt() / alert() - 改用 inline 状态机
 *   - mode='review': 通过 (无输入) / 拒绝 (必填理由)
 *   - mode='pay': 必填打款流水号 / 备注
 *   - 添加 aria-label / aria-busy / focus-ring-visible / role="alert"
 *   - input 16px 防 iOS 自动放大
 *   - 删除本地 formatYuan (用 helpers 共享)
 *   - 添加 leading-tight-cn
 */
export function WithdrawalActionButtons({
  withdrawalId,
  amount,
  displayName,
  mode,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<Decision | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setDialog(null);
    setNote('');
    setError(null);
  };

  const submit = async (decision: Decision) => {
    if (note.trim().length < 1) {
      setError('请填写备注');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/affiliates/withdraw/${withdrawalId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, process_note: note.trim() }),
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

  // ============== review 模式 - 拒绝 ==============
  if (mode === 'review' && dialog === 'rejected') {
    return (
      <div
        className="flex flex-col items-end gap-1.5 min-w-[220px]"
        role="dialog"
        aria-label={`拒绝 ${displayName} 的提现`}
      >
        <div className="text-xs text-slate-500 leading-tight-cn self-start">
          拒绝 {displayName} · {formatYuan(amount)}
        </div>
        <label htmlFor={`reject-${withdrawalId}`} className="sr-only">
          拒绝理由
        </label>
        <input
          id={`reject-${withdrawalId}`}
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="拒绝理由 (必填)"
          // 改版 v2: 16px 防 iOS 自动放大
          style={{ fontSize: '16px' }}
          disabled={busy}
          className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus-ring-visible"
        />
        {error && (
          <p className="text-xs text-red-600 leading-tight-cn self-start" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => submit('rejected')}
            disabled={busy || note.trim().length < 1}
            aria-busy={busy}
            className="text-xs px-2 py-1 rounded bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white focus-ring-visible leading-tight-cn"
          >
            {busy ? '处理中…' : '确认拒绝'}
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

  // ============== pay 模式 - 必填打款流水号 ==============
  if (mode === 'pay') {
    if (dialog === 'paid') {
      return (
        <div
          className="flex flex-col items-end gap-1.5 min-w-[220px]"
          role="dialog"
          aria-label={`标记 ${displayName} 已打款`}
        >
          <div className="text-xs text-slate-500 leading-tight-cn self-start">
            {displayName} · {formatYuan(amount)}
          </div>
          <label htmlFor={`paid-${withdrawalId}`} className="sr-only">
            打款流水号
          </label>
          <input
            id={`paid-${withdrawalId}`}
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="打款流水号 / 备注 (必填)"
            // 改版 v2: 16px 防 iOS 自动放大
            style={{ fontSize: '16px' }}
            disabled={busy}
            className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus-ring-visible"
          />
          {error && (
            <p className="text-xs text-red-600 leading-tight-cn self-start" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => submit('paid')}
              disabled={busy || note.trim().length < 1}
              aria-busy={busy}
              className="text-xs px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white focus-ring-visible leading-tight-cn"
            >
              {busy ? '处理中…' : '确认已打款'}
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

    // pay 模式 - 默认按钮
    return (
      <button
        type="button"
        onClick={() => setDialog('paid')}
        disabled={busy}
        aria-busy={busy}
        aria-label={`标记 ${displayName} 提现 ${formatYuan(amount)} 已打款`}
        className="text-xs px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white focus-ring-visible leading-tight-cn"
      >
        标记已打款
      </button>
    );
  }

  // ============== review 模式 - 默认按钮组 ==============
  return (
    <div
      className="flex gap-1 justify-end"
      role="group"
      aria-label={`审批 ${displayName} 提现 ${formatYuan(amount)}`}
    >
      <button
        type="button"
        onClick={async () => {
          // 通过无需输入, 直接调用
          setBusy(true);
          setError(null);
          try {
            const res = await fetch(`/api/admin/affiliates/withdraw/${withdrawalId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ decision: 'approved' }),
            });
            const data = await res.json();
            if (!res.ok) {
              setError(data.error || '未知错误');
              return;
            }
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : '网络错误');
          } finally {
            setBusy(false);
          }
        }}
        disabled={busy}
        aria-busy={busy}
        aria-label={`审批通过 ${displayName} 提现`}
        className="text-xs px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white focus-ring-visible leading-tight-cn"
      >
        {busy ? '处理中…' : '审批通过'}
      </button>
      <button
        type="button"
        onClick={() => setDialog('rejected')}
        disabled={busy}
        aria-busy={busy}
        aria-label={`拒绝 ${displayName} 提现`}
        className="text-xs px-2.5 py-1 rounded bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white focus-ring-visible leading-tight-cn"
      >
        拒绝
      </button>
    </div>
  );
}
