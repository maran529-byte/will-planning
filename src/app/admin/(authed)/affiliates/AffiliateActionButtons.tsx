'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  bloggerId: string;
  displayName: string;
}

type Decision = 'approved' | 'rejected';

/**
 * AffiliateActionButtons - 博主审核
 *
 * 改版 v2 (2026-06-09):
 *   - 删除 prompt() / alert() - 改用 inline 状态机
 *   - 通过时弹出佣金比例输入 (default 10, 范围 0-50)
 *   - 拒绝时弹出理由输入 (必填)
 *   - 添加 aria-label / aria-busy / focus-ring-visible / role="alert"
 *   - input 16px 防 iOS 自动放大
 *   - 添加 leading-tight-cn
 */
export function AffiliateActionButtons({ bloggerId, displayName }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<Decision | null>(null);
  const [note, setNote] = useState('');
  const [rate, setRate] = useState('10');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setDialog(null);
    setNote('');
    setRate('10');
    setError(null);
  };

  const submit = async (decision: Decision) => {
    setBusy(true);
    setError(null);
    try {
      const body: { decision: Decision; commission_rate?: number; review_note?: string } = {
        decision,
      };
      if (decision === 'approved') {
        const r = parseFloat(rate);
        if (isNaN(r) || r < 0 || r > 50) {
          setError('佣金比例必须是 0-50 之间的数字');
          setBusy(false);
          return;
        }
        body.commission_rate = Math.round(r * 100);
      } else {
        if (note.trim().length < 1) {
          setError('请填写拒绝理由');
          setBusy(false);
          return;
        }
        body.review_note = note.trim();
      }
      const res = await fetch(`/api/admin/affiliates/${bloggerId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  // ============== 通过 - 佣金比例对话框 ==============
  if (dialog === 'approved') {
    return (
      <div
        className="flex flex-col items-end gap-1.5 min-w-[200px]"
        role="dialog"
        aria-label={`通过博主 ${displayName} 的申请`}
      >
        <label
          htmlFor={`rate-${bloggerId}`}
          className="text-xs text-slate-600 leading-tight-cn self-start"
        >
          佣金比例 (%)
        </label>
        <input
          id={`rate-${bloggerId}`}
          type="number"
          min={0}
          max={50}
          step="0.1"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
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
            onClick={() => submit('approved')}
            disabled={busy}
            aria-busy={busy}
            className="text-xs px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white focus-ring-visible leading-tight-cn"
          >
            {busy ? '处理中…' : '确认通过'}
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

  // ============== 拒绝 - 理由输入 ==============
  if (dialog === 'rejected') {
    return (
      <div
        className="flex flex-col items-end gap-1.5 min-w-[220px]"
        role="dialog"
        aria-label={`拒绝博主 ${displayName} 的申请`}
      >
        <label
          htmlFor={`note-${bloggerId}`}
          className="text-xs text-slate-600 leading-tight-cn self-start"
        >
          拒绝理由 (必填)
        </label>
        <input
          id={`note-${bloggerId}`}
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="如: 资料不全"
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

  // ============== 默认按钮组 ==============
  return (
    <div className="flex gap-1 justify-end" role="group" aria-label={`审核 ${displayName}`}>
      <button
        type="button"
        onClick={() => setDialog('approved')}
        disabled={busy}
        aria-busy={busy}
        aria-label={`通过博主 ${displayName} 的申请`}
        className="text-xs px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white focus-ring-visible leading-tight-cn"
      >
        通过
      </button>
      <button
        type="button"
        onClick={() => setDialog('rejected')}
        disabled={busy}
        aria-busy={busy}
        aria-label={`拒绝博主 ${displayName} 的申请`}
        className="text-xs px-2.5 py-1 rounded bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white focus-ring-visible leading-tight-cn"
      >
        拒绝
      </button>
    </div>
  );
}
