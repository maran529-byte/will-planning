'use client';

/**
 * 红包转赠面板 (业务铁律 v1.1 · 1.7.5)
 *
 * 功能:
 *   1. PIN 设置 / 修改
 *   2. 转赠红包 (A 自定义金额, ≤ A 账户剩余, 6 位 PIN 验证)
 *   3. 转赠记录 + 24h 内可撤销
 *
 * 入口: H5 /wallet-policy 页面底部嵌入
 */

import { useEffect, useState } from 'react';
import {
  RED_PACKET_MIN_CENTS,
  RED_PACKET_MAX_CENTS,
  formatYuan,
  isValidPinFormat,
  validateTransferAmount,
  buildTransferConfirmText,
} from '@/lib/red_packet';
import { PIN_PLACEHOLDER } from '@/lib/user_pin';

interface Props {
  userId: string;
  availableCents: number;          // A 当前可用红包总额
  dailyTransferredCents: number;   // A 当日已转赠金额
  isLoggedIn: boolean;
  hasPinSet: boolean;
}

interface TransferRecord {
  id: string;
  direction: 'out' | 'in';
  counterparty: string;
  amount_cents: number;
  created_at: string;
  revoked_at: string | null;
  to_packet_status: 'issued' | 'used' | 'expired' | 'voided';
  can_revoke: boolean;
}

type Stage = 'idle' | 'set-pin' | 'pin-step' | 'confirm' | 'submitting' | 'success' | 'error';

export function TransferPanel({ userId, availableCents, dailyTransferredCents, isLoggedIn, hasPinSet }: Props) {
  const [stage, setStage] = useState<Stage>('idle');
  const [toUserId, setToUserId] = useState('');
  const [amountYuan, setAmountYuan] = useState('3');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinOld, setPinOld] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const amountCents = Math.round(parseFloat(amountYuan || '0') * 100) || 0;
  const remainingAfter = availableCents - amountCents;

  useEffect(() => {
    if (isLoggedIn) {
      fetchRecords();
    }
  }, [isLoggedIn]);

  async function fetchRecords() {
    setLoading(true);
    try {
      const res = await fetch('/api/red-packet/transfer?records=1', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
        <p className="text-sm text-slate-700 leading-relaxed-cn">
          🔐 转赠红包功能需要先 <a href="/login" className="text-amber-600 underline font-semibold">登录</a>
        </p>
      </div>
    );
  }

  // PIN 设置/修改
  if (stage === 'set-pin' || (stage === 'idle' && !hasPinSet)) {
    return (
      <SetPinForm
        isFirstTime={!hasPinSet}
        pinOld={pinOld}
        setPinOld={setPinOld}
        pin={pin}
        setPin={setPin}
        pinConfirm={pinConfirm}
        setPinConfirm={setPinConfirm}
        error={error}
        onSuccess={() => {
          setStage('idle');
          setError(null);
          setPin('');
          setPinConfirm('');
          setPinOld('');
        }}
        onCancel={() => setStage('idle')}
        onError={setError}
      />
    );
  }

  // 转赠表单
  if (stage === 'idle') {
    return (
      <div className="space-y-6">
        {/* 转赠操作区 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <span aria-hidden>🎁</span> 转赠红包
          </h3>
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-800">
            <p>您当前可用红包: <b className="tabular-nums">{formatYuan(availableCents)}</b></p>
            <p>今日已转赠: <b className="tabular-nums">{formatYuan(dailyTransferredCents)}</b> / ¥30</p>
          </div>

          <div>
            <label htmlFor="to_user_id" className="block text-sm font-medium text-slate-700 mb-1">
              接收人 ID <span className="text-red-500">*</span>
            </label>
            <input
              id="to_user_id"
              type="text"
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
              placeholder="请输入对方 user_id (UUID 格式)"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-xs text-slate-500 mt-1">提示: 接收人必须是已注册用户</p>
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-1">
              转赠金额 (¥) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                id="amount"
                type="number"
                step="0.01"
                min={(RED_PACKET_MIN_CENTS / 100).toString()}
                max={(RED_PACKET_MAX_CENTS / 100).toString()}
                value={amountYuan}
                onChange={(e) => setAmountYuan(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 tabular-nums"
                style={{ fontSize: '16px' }}
              />
              <span className="text-slate-500 text-sm">¥</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              范围 ¥{RED_PACKET_MIN_CENTS / 100} ~ ¥{RED_PACKET_MAX_CENTS / 100}, 单次上限 {formatYuan(availableCents)}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 leading-relaxed-cn" role="alert">
              ⚠️ {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const v = validateTransferAmount({
                  amountCents,
                  fromAvailableCents: availableCents,
                  fromDailyTransferredCents: dailyTransferredCents,
                });
                if (!v.ok) {
                  setError(v.reason || '校验失败');
                  return;
                }
                if (!toUserId) {
                  setError('请输入接收人 ID');
                  return;
                }
                setError(null);
                setStage('pin-step');
              }}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-lg transition"
            >
              下一步
            </button>
            <button
              type="button"
              onClick={() => setStage('set-pin')}
              className="px-4 py-3 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition"
            >
              {hasPinSet ? '修改 PIN' : '设置 PIN'}
            </button>
          </div>
        </section>

        {/* 转赠记录 */}
        <TransferRecords records={records} loading={loading} onRevoked={fetchRecords} />
      </div>
    );
  }

  if (stage === 'pin-step') {
    return (
      <PinConfirmStep
        amountCents={amountCents}
        toUserId={toUserId}
        pin={pin}
        setPin={setPin}
        onBack={() => setStage('idle')}
        onConfirm={async () => {
          if (!isValidPinFormat(pin)) {
            setError('PIN 必须是 6 位数字');
            return;
          }
          setError(null);
          setStage('confirm');
        }}
        error={error}
      />
    );
  }

  if (stage === 'confirm') {
    return (
      <ConfirmStep
        confirmText={buildTransferConfirmText({
          toDisplay: toUserId.slice(0, 8) + '...',
          amountCents,
          remainingAfterCents: Math.max(0, remainingAfter),
        })}
        onBack={() => setStage('pin-step')}
        onConfirm={async () => {
          setStage('submitting');
          setError(null);
          try {
            const res = await fetch('/api/red-packet/transfer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                to_user_id: toUserId,
                amount_cents: amountCents,
                pin,
              }),
            });
            const data = await res.json();
            if (!res.ok) {
              setError(data.error || '转赠失败');
              setStage('confirm');
              return;
            }
            setStage('success');
            setPin('');
            setToUserId('');
            setAmountYuan('3');
            fetchRecords();
          } catch (e) {
            setError(e instanceof Error ? e.message : '网络错误');
            setStage('confirm');
          }
        }}
      />
    );
  }

  if (stage === 'success') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-4">
        <div className="text-5xl">🎉</div>
        <h3 className="text-lg font-semibold text-emerald-800">转赠成功</h3>
        <p className="text-sm text-emerald-700">已成功转赠 {formatYuan(amountCents)} 给对方, 对方将在 30 天内可使用</p>
        <button
          type="button"
          onClick={() => setStage('idle')}
          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 px-6 rounded-lg"
        >
          继续转赠
        </button>
      </div>
    );
  }

  return null;
}

function SetPinForm(props: {
  isFirstTime: boolean;
  pinOld: string;
  setPinOld: (v: string) => void;
  pin: string;
  setPin: (v: string) => void;
  pinConfirm: string;
  setPinConfirm: (v: string) => void;
  error: string | null;
  onSuccess: () => void;
  onCancel: () => void;
  onError: (e: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">
        {props.isFirstTime ? '🔐 设置转赠 PIN' : '🔐 修改转赠 PIN'}
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed-cn">
        请设置 6 位数字 PIN。后续红包转赠 / 撤销都需要输入此 PIN 验证。
        错误 5 次将锁定账户 1 小时。
      </p>

      {!props.isFirstTime && (
        <div>
          <label htmlFor="pin_old" className="block text-sm font-medium text-slate-700 mb-1">
            旧 PIN
          </label>
          <input
            id="pin_old"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={props.pinOld}
            onChange={(e) => props.setPinOld(e.target.value.replace(/\D/g, ''))}
            placeholder={PIN_PLACEHOLDER}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 tabular-nums"
            style={{ fontSize: '16px' }}
          />
        </div>
      )}

      <div>
        <label htmlFor="pin_new" className="block text-sm font-medium text-slate-700 mb-1">
          新 PIN (6 位数字)
        </label>
        <input
          id="pin_new"
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={props.pin}
          onChange={(e) => props.setPin(e.target.value.replace(/\D/g, ''))}
          placeholder={PIN_PLACEHOLDER}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 tabular-nums"
          style={{ fontSize: '16px' }}
        />
      </div>

      <div>
        <label htmlFor="pin_confirm" className="block text-sm font-medium text-slate-700 mb-1">
          确认新 PIN
        </label>
        <input
          id="pin_confirm"
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={props.pinConfirm}
          onChange={(e) => props.setPinConfirm(e.target.value.replace(/\D/g, ''))}
          placeholder={PIN_PLACEHOLDER}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 tabular-nums"
          style={{ fontSize: '16px' }}
        />
      </div>

      {props.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3" role="alert">
          ⚠️ {props.error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            if (props.pin !== props.pinConfirm) {
              props.onError('两次输入的 PIN 不一致');
              return;
            }
            if (!isValidPinFormat(props.pin)) {
              props.onError('PIN 必须是 6 位数字');
              return;
            }
            setLoading(true);
            try {
              const res = await fetch('/api/red-packet/pin/set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ pin: props.pin, pin_confirm: props.pinConfirm }),
              });
              const data = await res.json();
              if (!res.ok) {
                props.onError(data.error || '设置 PIN 失败');
                return;
              }
              props.onSuccess();
            } catch (e) {
              props.onError(e instanceof Error ? e.message : '网络错误');
            } finally {
              setLoading(false);
            }
          }}
          className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white font-semibold py-3 rounded-lg"
        >
          {loading ? '设置中...' : '确认设置'}
        </button>
        <button
          type="button"
          onClick={props.onCancel}
          className="px-4 py-3 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50"
        >
          取消
        </button>
      </div>
    </section>
  );
}

function PinConfirmStep(props: {
  amountCents: number;
  toUserId: string;
  pin: string;
  setPin: (v: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  error: string | null;
}) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">🔐 输入 PIN 验证</h3>
      <p className="text-sm text-slate-600">
        转赠 <b className="text-amber-600">{formatYuan(props.amountCents)}</b> 给 <code className="bg-slate-100 px-1 rounded text-xs">{props.toUserId.slice(0, 8)}...</code>, 请输入 6 位 PIN
      </p>
      <input
        type="password"
        inputMode="numeric"
        maxLength={6}
        value={props.pin}
        onChange={(e) => props.setPin(e.target.value.replace(/\D/g, ''))}
        placeholder={PIN_PLACEHOLDER}
        className="w-full px-4 py-3 border border-slate-300 rounded-lg text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500 tabular-nums"
        style={{ fontSize: '20px' }}
        autoFocus
      />
      {props.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3" role="alert">
          ⚠️ {props.error}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={props.onConfirm}
          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-lg"
        >
          验证
        </button>
        <button
          type="button"
          onClick={props.onBack}
          className="px-4 py-3 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50"
        >
          返回
        </button>
      </div>
    </section>
  );
}

function ConfirmStep(props: {
  confirmText: string;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">⚠️ 最后确认</h3>
      <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{props.confirmText}</p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              await props.onConfirm();
            } finally {
              setLoading(false);
            }
          }}
          className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 text-white font-semibold py-3 rounded-lg"
        >
          {loading ? '转赠中...' : '确认转赠'}
        </button>
        <button
          type="button"
          onClick={props.onBack}
          className="px-4 py-3 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50"
        >
          返回
        </button>
      </div>
    </section>
  );
}

function TransferRecords(props: {
  records: TransferRecord[];
  loading: boolean;
  onRevoked: () => void;
}) {
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokePin, setRevokePin] = useState('');
  const [revokeError, setRevokeError] = useState<string | null>(null);

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
      <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
        <span aria-hidden>📋</span> 转赠记录 (最近 20 条)
      </h3>
      {props.loading ? (
        <p className="text-sm text-slate-500 text-center py-4">加载中...</p>
      ) : props.records.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">暂无转赠记录</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {props.records.map((r) => (
            <li key={r.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  {r.direction === 'out' ? '↗️ 转出' : '↙️ 转入'} {formatYuan(r.amount_cents)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(r.created_at).toLocaleString('zh-CN')} · {r.direction === 'out' ? '给' : '来自'} {r.counterparty.slice(0, 8)}...
                </p>
                {r.revoked_at && (
                  <span className="inline-block text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded mt-1">已撤销</span>
                )}
              </div>
              {r.can_revoke && r.direction === 'out' && (
                <button
                  type="button"
                  onClick={() => {
                    setRevokingId(r.id);
                    setRevokePin('');
                    setRevokeError(null);
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 underline shrink-0"
                >
                  撤销
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {revokingId && (
        <div className="border-t pt-4 space-y-3">
          <p className="text-sm font-medium text-slate-700">输入 PIN 撤销此转赠</p>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={revokePin}
            onChange={(e) => setRevokePin(e.target.value.replace(/\D/g, ''))}
            placeholder={PIN_PLACEHOLDER}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg text-center text-xl tracking-widest tabular-nums"
            style={{ fontSize: '16px' }}
          />
          {revokeError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-2" role="alert">
              ⚠️ {revokeError}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                setRevokeError(null);
                try {
                  const res = await fetch('/api/red-packet/transfer/revoke', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ transfer_id: revokingId, pin: revokePin }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    setRevokeError(data.error || '撤销失败');
                    return;
                  }
                  setRevokingId(null);
                  setRevokePin('');
                  props.onRevoked();
                } catch (e) {
                  setRevokeError(e instanceof Error ? e.message : '网络错误');
                }
              }}
              className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-semibold py-2 rounded-lg text-sm"
            >
              确认撤销
            </button>
            <button
              type="button"
              onClick={() => setRevokingId(null)}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-sm rounded-lg"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
