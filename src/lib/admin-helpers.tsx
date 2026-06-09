/**
 * Admin 共享辅助函数
 *
 * 改版 v1 (2026-06-09, dedup):
 *   此前 8 个 admin 页面每个都重复定义了 formatYuan / timeAgo,
 *   还有 5+ 个页面重复了 StatusBadge, 导致代码冗余难以维护。
 *   提取到这里统一导出。
 *
 * 包含:
 *   - formatYuan(cents)         分 → 元 (¥xx.xx)
 *   - formatYuanCompact(cents)  万元单位 (¥1.23万)
 *   - timeAgo(iso)              时间戳 → "5分钟前"
 *   - timeUntil(iso)            未来时间戳 → "5分钟后" (律师预约场景)
 *   - OrderStatusBadge          订单状态徽章 (4 种)
 *   - RoleBadge                 角色徽章 (4 种)
 *   - BookingStatusBadge        律师预约状态徽章 (5 种)
 *   - WithdrawalStatusBadge     提现状态徽章 (5 种)
 *   - BloggerStatusBadge        博主状态徽章 (4 种)
 *   - AffiliateStatusBadge      支付事件状态 (4 种) + 渠道 (3 种)
 *
 * 设计原则:
 *   - 所有 Badge 都是 server-component-compatible (无 'use client')
 *   - 颜色 class 用 Tailwind v4 标准名 (slate/amber/emerald/...)
 *   - 每个 Badge 自带 role="status" 便于屏幕阅读器
 */

// =============================================================================
// 金额 + 时间 格式化
// =============================================================================

/** 分 → 元 (¥xx.xx) */
export function formatYuan(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`;
}

/** 分 → 元 (¥1.23万) 紧凑格式, 适合 dashboard 大数字 */
export function formatYuanCompact(cents: number): string {
  if (cents >= 10000) return `¥${(cents / 100000).toFixed(2)}万`;
  return formatYuan(cents);
}

/** 已过去的时间 (过去 → 未来都支持) */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '-';
  const ms = Date.now() - new Date(iso).getTime();
  // 未来时间 → 用 timeUntil
  if (ms < 0) {
    return timeUntil(iso);
  }
  const m = Math.floor(ms / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  return `${Math.floor(h / 24)}天前`;
}

/** 未来时间 (律师预约场景, "5分钟后") */
export function timeUntil(iso: string | null | undefined): string {
  if (!iso) return '-';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) {
    // 实际是过去 → fallback
    return timeAgo(iso);
  }
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}分钟后`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时后`;
  return `${Math.floor(h / 24)}天后`;
}

// =============================================================================
// 订单状态徽章
// =============================================================================

const ORDER_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: '待支付', cls: 'bg-amber-100 text-amber-700' },
  paid: { label: '已支付', cls: 'bg-emerald-100 text-emerald-700' },
  refunded: { label: '已退款', cls: 'bg-slate-100 text-slate-600' },
  cancelled: { label: '已取消', cls: 'bg-red-100 text-red-700' },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const m = ORDER_STATUS_MAP[status] || { label: status, cls: 'bg-slate-100 text-slate-600' };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded ${m.cls}`}
      role="status"
      aria-label={`订单状态: ${m.label}`}
    >
      {m.label}
    </span>
  );
}

// =============================================================================
// 套餐徽章 (Admin 概览 / 订单表用)
// =============================================================================

const PLAN_MAP: Record<string, { label: string; cls: string }> = {
  ai: { label: 'AI', cls: 'bg-slate-100 text-slate-700' },
  expert: { label: '专家', cls: 'bg-amber-100 text-amber-700' },
  lawyer: { label: '专家(旧)', cls: 'bg-amber-50 text-amber-600' },
  family: { label: '家族(下架)', cls: 'bg-slate-50 text-slate-500' },
};

export function PlanBadge({ plan }: { plan: string }) {
  const m = PLAN_MAP[plan] || { label: plan, cls: 'bg-slate-100 text-slate-600' };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded ${m.cls}`}
      role="status"
      aria-label={`套餐: ${m.label}`}
    >
      {m.label}
    </span>
  );
}

// =============================================================================
// 角色徽章 (用户表)
// =============================================================================

const ROLE_MAP: Record<string, { label: string; cls: string }> = {
  user: { label: '用户', cls: 'bg-slate-100 text-slate-600' },
  blogger: { label: '博主', cls: 'bg-pink-100 text-pink-700' },
  lawyer: { label: '律师', cls: 'bg-purple-100 text-purple-700' },
  admin: { label: '管理员', cls: 'bg-amber-100 text-amber-700' },
};

export function RoleBadge({ role }: { role: string }) {
  const m = ROLE_MAP[role] || { label: role, cls: 'bg-slate-100 text-slate-600' };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded ${m.cls}`}
      role="status"
      aria-label={`角色: ${m.label}`}
    >
      {m.label}
    </span>
  );
}

// =============================================================================
// 律师预约状态徽章
// =============================================================================

const BOOKING_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: '待确认', cls: 'bg-amber-100 text-amber-700' },
  confirmed: { label: '已确认', cls: 'bg-blue-100 text-blue-700' },
  completed: { label: '已完成', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: '已取消', cls: 'bg-slate-100 text-slate-600' },
  no_show: { label: '未到场', cls: 'bg-red-100 text-red-700' },
};

export function BookingStatusBadge({ status }: { status: string }) {
  const m = BOOKING_STATUS_MAP[status] || { label: status, cls: 'bg-slate-100 text-slate-600' };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded ${m.cls}`}
      role="status"
      aria-label={`预约状态: ${m.label}`}
    >
      {m.label}
    </span>
  );
}

// =============================================================================
// 提现状态徽章
// =============================================================================

const WITHDRAWAL_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: '待审批', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: '已审批', cls: 'bg-blue-100 text-blue-700' },
  paid: { label: '✅ 已打款', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: '已拒绝', cls: 'bg-red-100 text-red-700' },
  cancelled: { label: '已撤销', cls: 'bg-slate-100 text-slate-600' },
};

export function WithdrawalStatusBadge({ status }: { status: string }) {
  const m = WITHDRAWAL_STATUS_MAP[status] || { label: status, cls: 'bg-slate-100 text-slate-600' };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded ${m.cls}`}
      role="status"
      aria-label={`提现状态: ${m.label}`}
    >
      {m.label}
    </span>
  );
}

// =============================================================================
// 博主状态徽章
// =============================================================================

const BLOGGER_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: '待审核', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: '已通过', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: '已拒绝', cls: 'bg-red-100 text-red-700' },
  disabled: { label: '已禁用', cls: 'bg-slate-200 text-slate-600' },
};

export function BloggerStatusBadge({ status }: { status: string }) {
  const m = BLOGGER_STATUS_MAP[status] || { label: status, cls: 'bg-slate-100 text-slate-600' };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded ${m.cls}`}
      role="status"
      aria-label={`博主状态: ${m.label}`}
    >
      {m.label}
    </span>
  );
}

// =============================================================================
// 支付事件状态 + 渠道 (payment-events 页)
// =============================================================================

export const PAYMENT_EVENT_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  received: { label: '⏳ 收到', cls: 'bg-amber-100 text-amber-700' },
  processed: { label: '✅ 已处理', cls: 'bg-emerald-100 text-emerald-700' },
  failed: { label: '❌ 失败', cls: 'bg-red-100 text-red-700' },
  ignored: { label: '⏭ 忽略', cls: 'bg-slate-100 text-slate-500' },
};

export function PaymentEventStatusBadge({ status }: { status: string }) {
  const m = PAYMENT_EVENT_STATUS_MAP[status] || PAYMENT_EVENT_STATUS_MAP.received;
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded ${m.cls}`}
      role="status"
      aria-label={`事件状态: ${m.label}`}
    >
      {m.label}
    </span>
  );
}

export const PAYMENT_CHANNEL_MAP: Record<string, { label: string; cls: string }> = {
  wechat: { label: '微信', cls: 'bg-green-100 text-green-700' },
  alipay: { label: '支付宝', cls: 'bg-blue-100 text-blue-700' },
  manual: { label: '人工', cls: 'bg-amber-100 text-amber-700' },
};

export function PaymentChannelBadge({ channel }: { channel: string }) {
  const m = PAYMENT_CHANNEL_MAP[channel] || PAYMENT_CHANNEL_MAP.manual;
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded ${m.cls}`}
      role="status"
      aria-label={`支付渠道: ${m.label}`}
    >
      {m.label}
    </span>
  );
}

// =============================================================================
// 提现方式 label
// =============================================================================

export const WITHDRAWAL_METHOD_LABEL: Record<string, string> = {
  alipay: '支付宝',
  wechat: '微信',
  bank: '银行卡',
};

// =============================================================================
// StatCard: dashboard 风格的指标卡
// =============================================================================

const STAT_COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-900 border-blue-200',
  emerald: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  amber: 'bg-amber-50 text-amber-900 border-amber-200',
  red: 'bg-red-50 text-red-900 border-red-200',
  pink: 'bg-pink-50 text-pink-900 border-pink-200',
  slate: 'bg-slate-50 text-slate-900 border-slate-200',
};

export function StatCard({
  label,
  value,
  subValue,
  accent = 'slate',
  link,
}: {
  label: string;
  value: number | string;
  subValue?: string;
  accent?: keyof typeof STAT_COLOR_MAP;
  link?: string;
}) {
  const cls = STAT_COLOR_MAP[accent] || STAT_COLOR_MAP.slate;
  const content = (
    <div
      className={`rounded-xl border p-4 ${cls} ${link ? 'hover:shadow-sm cursor-pointer transition' : ''}`}
      role="status"
      aria-label={`${label}: ${value}${subValue ? ', ' + subValue : ''}`}
    >
      <p className="text-xs font-medium opacity-80 mb-1 leading-tight-cn">{label}</p>
      <p className="text-2xl font-bold leading-tight-cn tabular-nums">{value}</p>
      {subValue && <p className="text-xs opacity-70 mt-1 leading-relaxed-cn">{subValue}</p>}
    </div>
  );
  if (link) {
    // 动态 Link 包裹, 用 anchor 避免引入 next/link 增加 bundle
    return (
      <a href={link} className="block focus-ring-visible">
        {content}
      </a>
    );
  }
  return content;
}
