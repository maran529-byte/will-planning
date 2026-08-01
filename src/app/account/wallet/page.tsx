"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * /account/wallet - 我的钱包余额 + 流水
 *
 * 改版 v1 (2026-07-20):
 *   - 大字号余额显示 (¥XX.XX)
 *   - 即将过期余额单独提示 (30 天内)
 *   - 最近 20 条流水
 *   - 强调"仅限服务费抵用"
 */

interface WalletData {
  balance_cents: number;
  total_earned_cents: number;
  total_consumed_cents: number;
  total_expired_cents: number;
  expiring_soon_cents: number;
  recent: Array<{
    id: string;
    type: string;
    amount_cents: number;
    ref_issue_id: string | null;
    ref_order_id: string | null;
    expires_at: string | null;
    expired_at: string | null;
    note: string | null;
    created_at: string;
  }>;
}

const TX_LABEL: Record<string, { label: string; emoji: string; color: string }> = {
  reward: { label: "红包奖励", emoji: "🎁", color: "text-green-600" },
  consume: { label: "消费抵用", emoji: "🛒", color: "text-blue-600" },
  refund: { label: "退款返还", emoji: "↩️", color: "text-slate-600" },
  expire: { label: "已过期", emoji: "⏰", color: "text-red-500" },
};

export default function WalletPage() {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/wallet")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4 text-center text-slate-400">
        加载中...
      </div>
    );
  }

  const balance = data?.balance_cents ?? 0;
  const expiring = data?.expiring_soon_cents ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        <header>
          <h1 className="text-2xl font-bold text-slate-800">我的钱包</h1>
          <p className="text-sm text-slate-500 mt-1">红包余额仅限站内服务费抵用</p>
        </header>

        {/* 余额主卡片 */}
        <section className="bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="text-sm opacity-90">可用余额</div>
          <div className="text-4xl font-bold mt-1 tabular-nums">
            ¥{(balance / 100).toFixed(2)}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs opacity-90">
            <span>累计获得: ¥{((data?.total_earned_cents ?? 0) / 100).toFixed(2)}</span>
            <span>累计使用: ¥{((data?.total_consumed_cents ?? 0) / 100).toFixed(2)}</span>
            <span>累计过期: ¥{((data?.total_expired_cents ?? 0) / 100).toFixed(2)}</span>
          </div>
          <div className="mt-4 flex gap-2">
            <Link
              href="/payment"
              className="bg-white text-amber-600 font-medium text-sm px-4 py-2 rounded-lg hover:bg-amber-50 transition"
            >
              🛒 去下单抵用
            </Link>
            <Link
              href="/feedback"
              className="bg-white/20 text-white text-sm px-4 py-2 rounded-lg hover:bg-white/30 transition"
            >
              🐛 提交问题赚红包
            </Link>
          </div>
        </section>

        {/* 即将过期提示 */}
        {expiring > 0 && (
          <section
            role="alert"
            className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-3"
          >
            <span className="text-2xl flex-shrink-0" aria-hidden>⏰</span>
            <div>
              <div className="font-medium text-amber-900">
                您有 ¥{(expiring / 100).toFixed(2)} 红包将在 30 天内过期
              </div>
              <p className="text-sm text-amber-700 mt-1">
                过期后会自动清零, 不补发。建议尽快使用。
              </p>
            </div>
          </section>
        )}

        {/* 使用说明 */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 text-sm space-y-2">
          <h2 className="font-semibold text-slate-800">红包使用规则</h2>
          <ul className="text-slate-600 space-y-1.5 text-xs">
            <li>✅ 仅限站内服务费抵用 (下单时自动抵扣)</li>
            <li>❌ 不可提现、不可转赠、不可兑换现金</li>
            <li>⏰ 每笔红包 180 天有效, 过期自动清零</li>
            <li>🔄 订单退款时, 已用红包原路退回 (新 180 天有效期)</li>
          </ul>
          <Link href="/wallet-policy" className="inline-block text-amber-600 underline text-xs mt-1">
            查看完整规则 →
          </Link>
        </section>

        {/* 流水 */}
        <section>
          <h2 className="font-semibold text-slate-800 text-sm mb-2">最近流水</h2>
          {data?.recent && data.recent.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
              {data.recent.map((tx) => {
                const t = TX_LABEL[tx.type] ?? TX_LABEL.consume;
                const sign = tx.type === "reward" || tx.type === "refund" ? "+" : "-";
                return (
                  <div key={tx.id} className="px-4 py-3 flex items-center justify-between gap-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span aria-hidden>{t.emoji}</span>
                        <span className="text-slate-800">{t.label}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate">
                        {new Date(tx.created_at).toLocaleString("zh-CN")}
                        {tx.note && ` · ${tx.note}`}
                      </div>
                      {tx.expires_at && !tx.expired_at && (
                        <div className="text-xs text-amber-600 mt-0.5">
                          ⏰ {new Date(tx.expires_at).toLocaleDateString("zh-CN")} 到期
                        </div>
                      )}
                    </div>
                    <div className={`font-bold tabular-nums ${t.color}`}>
                      {sign}¥{(tx.amount_cents / 100).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
              📭 暂无流水
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
