"use client";

import { useEffect, useState } from "react";

/**
 * WalletBalance - 支付页的"红包余额"展示 + 抵用开关
 *
 * 改版 v1 (2026-07-20):
 *   - 从 /api/wallet 读取用户余额
 *   - 用户可切换"使用余额"开关
 *   - 余额 >= 订单价 → 仅显示余额支付按钮
 *   - 余额 < 订单价 → 余额+其他方式混合支付 (TODO: 后端完整支持)
 *   - 未登录显示"登录查看余额"链接
 */

interface WalletData {
  balance_cents: number;
  expiring_soon_cents: number;
}

interface Props {
  priceCents: number;
  useWallet: boolean;
  setUseWallet: (v: boolean) => void;
}

export function WalletBalance({ priceCents, useWallet, setUseWallet }: Props) {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);

  useEffect(() => {
    fetch("/api/wallet")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setData({ balance_cents: d.balance_cents, expiring_soon_cents: d.expiring_soon_cents });
          if (d.balance_cents === 0 && d.total_earned_cents === 0 && d.recent?.length === 0) {
            // 可能是未登录或新用户 — 都不阻止显示
          }
        }
      })
      .catch(() => setLoggedIn(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 animate-pulse">
        <div className="h-4 bg-amber-100 rounded w-1/3" />
      </div>
    );
  }

  const balance = data?.balance_cents ?? 0;
  const expiring = data?.expiring_soon_cents ?? 0;
  const canCover = balance >= priceCents;
  const partialAmount = Math.min(balance, priceCents);

  if (balance === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-xs text-slate-600 flex items-center justify-between">
        <span>🎁 您还没有红包余额</span>
        <a href="/feedback" className="text-amber-600 underline font-medium">
          提交问题赚红包 →
        </a>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-4 mb-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="text-xs text-amber-700 font-medium">🎁 可用红包余额</div>
          <div className="text-2xl font-bold text-amber-900 tabular-nums mt-0.5">
            ¥{(balance / 100).toFixed(2)}
          </div>
          {expiring > 0 && (
            <div className="text-xs text-amber-700 mt-1">
              ⏰ 其中 ¥{(expiring / 100).toFixed(2)} 将在 30 天内过期
            </div>
          )}
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={useWallet}
            onChange={(e) => setUseWallet(e.target.checked)}
            className="w-5 h-5 accent-amber-600"
            aria-label="使用红包余额支付"
          />
          <span className="text-sm font-medium text-amber-800">使用余额</span>
        </label>
      </div>

      {useWallet && (
        <div className="text-xs text-amber-800 leading-relaxed bg-white/50 rounded p-2 border border-amber-200">
          {canCover ? (
            <span>
              ✅ 余额充足, 此次可全额用 ¥{(balance / 100).toFixed(2)} 红包支付
            </span>
          ) : (
            <span>
              💡 余额可抵扣 ¥{(partialAmount / 100).toFixed(2)},
              还需支付 ¥{((priceCents - partialAmount) / 100).toFixed(2)} (微信/支付宝)
            </span>
          )}
          <div className="mt-1 text-amber-600">
            <a href="/wallet-policy" className="underline">
              使用规则
            </a>
            <span className="mx-1.5">·</span>
            <a href="/account/wallet" className="underline">
              查看明细
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
