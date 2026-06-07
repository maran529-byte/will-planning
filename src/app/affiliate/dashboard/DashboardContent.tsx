'use client';

import { useState } from 'react';
import type { Blogger, BloggerDashboard, DownlineRow } from '@/lib/affiliate';
import type { Withdrawal } from '@/lib/affiliate';

interface Props {
  blogger: Blogger;
  stats: BloggerDashboard['stats'];
  withdrawals: Withdrawal[];
  downline: DownlineRow[];
}

function formatYuan(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  return `${Math.floor(h / 24)}天前`;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: '⏳ 待结算', cls: 'bg-amber-100 text-amber-700' },
  available: { label: '✅ 可提现', cls: 'bg-emerald-100 text-emerald-700' },
  withdrawn: { label: '💸 已提现', cls: 'bg-blue-100 text-blue-700' },
  voided: { label: '↩️ 已撤回', cls: 'bg-slate-100 text-slate-500 line-through' },
};

const WITHDRAWAL_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: '待审批', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: '已审批待打款', cls: 'bg-blue-100 text-blue-700' },
  paid: { label: '✅ 已打款', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: '已拒绝', cls: 'bg-red-100 text-red-700' },
  cancelled: { label: '已撤销', cls: 'bg-slate-100 text-slate-600' },
};

const BLOGGER_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: '⏳ 待审核', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: '✅ 已通过', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: '❌ 未通过', cls: 'bg-red-100 text-red-700' },
  disabled: { label: '🚫 已禁用', cls: 'bg-slate-100 text-slate-500' },
};

export function DashboardContent({ blogger, stats, withdrawals, downline }: Props) {
  const [copied, setCopied] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [busy, setBusy] = useState(false);

  const refLink = typeof window !== 'undefined'
    ? `${window.location.origin}/?ref=${blogger.ref_code}`
    : `https://aiwill-planner.cn/?ref=${blogger.ref_code}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(refLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 降级方案
      const ta = document.createElement('textarea');
      ta.value = refLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        {/* 标题 */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-1">
            📊 博主工作台
          </h1>
          <p className="text-sm text-slate-600">欢迎, {blogger.display_name || '博主'}</p>
        </div>

        {/* 推广码卡片 */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 sm:p-8 text-white shadow-md mb-6">
          <div className="text-sm opacity-90 mb-1">您的推广码</div>
          <div className="flex items-center gap-3 mb-4">
            <code className="text-3xl sm:text-4xl font-mono font-bold tracking-wider">
              {blogger.ref_code}
            </code>
          </div>
          <div className="text-sm opacity-90 mb-2">推广链接</div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              value={refLink}
              className="flex-1 rounded-lg bg-white/20 backdrop-blur px-3 py-2 text-sm font-mono text-white placeholder-white/70"
            />
            <button
              onClick={copyLink}
              className="rounded-lg bg-white text-amber-600 hover:bg-amber-50 px-5 py-2 text-sm font-semibold whitespace-nowrap"
            >
              {copied ? '✓ 已复制' : '复制链接'}
            </button>
            <a
              href="/affiliate/poster"
              className="rounded-lg bg-white/20 backdrop-blur hover:bg-white/30 text-white px-5 py-2 text-sm font-semibold whitespace-nowrap text-center"
            >
              📱 海报
            </a>
          </div>
        </div>

        {/* 6 张统计卡 (含 tier-1/2 拆分) */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          <StatCard label="总点击" value={stats.total_clicks} unit="次" />
          <StatCard label="转化订单" value={stats.total_conversions} unit="单" />
          <StatCard label="累计佣金" value={formatYuan(stats.total_commission)} />
          <StatCard
            label="可提现"
            value={formatYuan(stats.available_commission)}
            highlight
          />
          <StatCard
            label="直接佣金 (tier-1)"
            value={formatYuan(stats.tier1_commission)}
            sublabel={`${(blogger.commission_rate / 100).toFixed(0)}% 比例`}
          />
          <StatCard
            label="间推佣金 (tier-2)"
            value={formatYuan(stats.tier2_commission)}
            sublabel="来自下级 3%"
            accent
          />
        </div>

        {/* 提现按钮 */}
        <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm text-slate-600">当前可提现余额</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {formatYuan(blogger.available_cents)}
              </div>
              {stats.pending_withdrawal_amount > 0 && (
                <div className="text-xs text-amber-600 mt-1">
                  含 {formatYuan(stats.pending_withdrawal_amount)} 待审批中
                </div>
              )}
            </div>
            <button
              onClick={() => setShowWithdraw(true)}
              disabled={blogger.available_cents < 1000}
              className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-medium"
            >
              💸 申请提现
            </button>
          </div>
        </div>

        {/* 佣金明细 */}
        <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-3">💰 佣金明细 (最近 10 条)</h2>
          {stats.recent_commissions.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">暂无佣金记录</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="text-xs text-slate-500 border-b">
                  <tr>
                    <th className="text-left py-2 px-2">订单金额</th>
                    <th className="text-right py-2 px-2">佣金</th>
                    <th className="text-center py-2 px-2">层级</th>
                    <th className="text-center py-2 px-2">比例</th>
                    <th className="text-center py-2 px-2">状态</th>
                    <th className="text-right py-2 px-2">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_commissions.map((c) => {
                    const s = STATUS_MAP[c.status] || { label: c.status, cls: 'bg-slate-100 text-slate-600' };
                    const tierBadge = c.tier === 2
                      ? <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">tier-2</span>
                      : <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">tier-1</span>;
                    return (
                      <tr key={c.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 px-2">{formatYuan(c.order_amount_cents)}</td>
                        <td className="py-2 px-2 text-right font-semibold">
                          {formatYuan(c.commission_cents)}
                        </td>
                        <td className="py-2 px-2 text-center">{tierBadge}</td>
                        <td className="py-2 px-2 text-center text-slate-500 text-xs">
                          {(c.rate / 100).toFixed(0)}%
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded ${s.cls}`}>{s.label}</span>
                        </td>
                        <td className="py-2 px-2 text-right text-xs text-slate-500">
                          {timeAgo(c.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 我的团队 (二级分销) */}
        <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-800">
              👥 我的团队 <span className="text-sm font-normal text-slate-500">({stats.downline_count} 位下级)</span>
            </h2>
            {stats.downline_count > 0 && (
              <span className="text-sm text-amber-600 font-semibold">
                已获得 tier-2: {formatYuan(stats.tier2_commission)}
              </span>
            )}
          </div>
          {downline.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-slate-400 text-sm mb-3">暂无下级博主</p>
              <p className="text-xs text-slate-500">
                分享您的 <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{blogger.ref_code}</code> 推广码邀请其他博主,
                当他们的订单成交时, 您可获得 3% 的间推奖励
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="text-xs text-slate-500 border-b">
                  <tr>
                    <th className="text-left py-2 px-2">博主</th>
                    <th className="text-center py-2 px-2">状态</th>
                    <th className="text-right py-2 px-2">TA 的累计佣金</th>
                    <th className="text-right py-2 px-2">您的 tier-2 收入</th>
                    <th className="text-right py-2 px-2">注册时间</th>
                  </tr>
                </thead>
                <tbody>
                  {downline.map((d) => {
                    const s = BLOGGER_STATUS_MAP[d.status] || { label: d.status, cls: 'bg-slate-100 text-slate-600' };
                    return (
                      <tr key={d.blogger_id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 px-2">
                          <div className="font-medium text-slate-800">
                            {d.display_name || '(未命名)'}
                          </div>
                          {d.ref_code && (
                            <div className="text-xs text-slate-500 font-mono">
                              {d.ref_code}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded ${s.cls}`}>{s.label}</span>
                        </td>
                        <td className="py-2 px-2 text-right text-slate-700">
                          {formatYuan(d.tier1_commission)}
                        </td>
                        <td className="py-2 px-2 text-right font-semibold text-amber-600">
                          {formatYuan(d.tier2_paid_to_me)}
                        </td>
                        <td className="py-2 px-2 text-right text-xs text-slate-500">
                          {timeAgo(d.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 提现记录 */}
        <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-3">💳 提现记录</h2>
          {withdrawals.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">暂无提现记录</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="text-xs text-slate-500 border-b">
                  <tr>
                    <th className="text-right py-2 px-2">金额</th>
                    <th className="text-left py-2 px-2">方式</th>
                    <th className="text-center py-2 px-2">状态</th>
                    <th className="text-right py-2 px-2">申请时间</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => {
                    const s = WITHDRAWAL_STATUS_MAP[w.status] || { label: w.status, cls: 'bg-slate-100 text-slate-600' };
                    const methodLabel = { alipay: '支付宝', wechat: '微信', bank: '银行卡' }[w.contact_method];
                    return (
                      <tr key={w.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 px-2 text-right font-semibold">{formatYuan(w.amount_cents)}</td>
                        <td className="py-2 px-2 text-slate-600">{methodLabel}</td>
                        <td className="py-2 px-2 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded ${s.cls}`}>{s.label}</span>
                        </td>
                        <td className="py-2 px-2 text-right text-xs text-slate-500">
                          {timeAgo(w.requested_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 最近点击 */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-3">👆 最近点击 (20 条)</h2>
          {stats.recent_clicks.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">暂无点击记录, 快去推广吧</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="text-xs text-slate-500 border-b">
                  <tr>
                    <th className="text-left py-2 px-2">落地页</th>
                    <th className="text-left py-2 px-2">IP</th>
                    <th className="text-center py-2 px-2">转化</th>
                    <th className="text-right py-2 px-2">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_clicks.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 px-2 font-mono text-xs text-slate-700">{c.landing_path}</td>
                      <td className="py-2 px-2 font-mono text-xs text-slate-500">
                        {c.ip ? c.ip.replace(/\.\d+$/, '.***') : '-'}
                      </td>
                      <td className="py-2 px-2 text-center text-xs">
                        {c.converted_at ? (
                          <span className="text-emerald-600">✓ 已转化</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right text-xs text-slate-500">
                        {timeAgo(c.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showWithdraw && (
        <WithdrawModal
          maxAmount={blogger.available_cents}
          onClose={() => setShowWithdraw(false)}
          onSuccess={() => {
            setShowWithdraw(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, unit, highlight, accent, sublabel }: {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
  accent?: boolean;
  sublabel?: string;
}) {
  const bg = highlight
    ? 'bg-emerald-50 border border-emerald-200'
    : accent
      ? 'bg-amber-50 border border-amber-200'
      : 'bg-white';
  const valueColor = highlight
    ? 'text-emerald-600'
    : accent
      ? 'text-amber-600'
      : 'text-slate-800';

  return (
    <div className={`rounded-xl p-4 ${bg} shadow-sm`}>
      <div className="text-xs text-slate-600 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${valueColor}`}>
        {value}
        {unit && <span className="text-sm text-slate-500 ml-1">{unit}</span>}
      </div>
      {sublabel && (
        <div className="text-xs text-slate-500 mt-1">{sublabel}</div>
      )}
    </div>
  );
}

function WithdrawModal({
  maxAmount,
  onClose,
  onSuccess,
}: {
  maxAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState((maxAmount / 100).toFixed(2));
  const [method, setMethod] = useState<'alipay' | 'wechat' | 'bank'>('alipay');
  const [contactInfo, setContactInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountCents = Math.round(parseFloat(amount || '0') * 100);

  const handleSubmit = async () => {
    setError(null);
    if (amountCents < 1000) {
      setError('最低提现 ¥10');
      return;
    }
    if (amountCents > maxAmount) {
      setError(`可提现余额仅 ¥${(maxAmount / 100).toFixed(2)}`);
      return;
    }
    if (contactInfo.trim().length < 4) {
      setError('请填写打款账号');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/affiliate/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_cents: amountCents,
          contact_method: method,
          contact_info: contactInfo.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '申请失败');
        return;
      }
      alert('提现申请已提交, 我们会尽快处理');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-800 mb-4">💸 申请提现</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              提现金额 (¥)
            </label>
            <input
              type="number"
              step="0.01"
              min="10"
              max={(maxAmount / 100).toFixed(2)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="text-xs text-slate-500 mt-1">
              可提现: ¥{(maxAmount / 100).toFixed(2)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              收款方式
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: 'alipay', l: '支付宝' },
                { v: 'wechat', l: '微信' },
                { v: 'bank', l: '银行卡' },
              ].map((m) => (
                <button
                  key={m.v}
                  type="button"
                  onClick={() => setMethod(m.v as 'alipay' | 'wechat' | 'bank')}
                  className={`py-2 rounded-lg text-sm font-medium border ${
                    method === m.v
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {m.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {method === 'alipay' ? '支付宝账号' : method === 'wechat' ? '微信号' : '银行卡号'}
            </label>
            <input
              type="text"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder={
                method === 'alipay' ? '138****1234' :
                method === 'wechat' ? '微信号' : '银行卡号 (我们仅保留后 4 位)'
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={busy}
              className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white text-sm font-medium"
            >
              {busy ? '提交中...' : '提交申请'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
