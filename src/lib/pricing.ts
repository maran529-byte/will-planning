// Authoritative server-side pricing. Prices are in 分 (cents) to avoid
// floating-point money bugs. The client is NEVER trusted to supply a price:
// create-order must look up the amount here based on the requested plan.
//
// 改版 v2 (2026-06):
//  - 删去 'family' 套餐 (产品精简, 仅 2 档)
//  - 'lawyer' → 'expert' (合规: 业务介绍中不再出现"律师"称谓, 改为"专业资产规划人员")
//    — 注: 数据库 enum 仍保留 'lawyer' 旧值 (兼容历史订单), UI 层做映射。
//
// 改版 v3 (2026-07-30, 产品精简):
//  - 前端: 取消"专家护航版"显示, 全站只展示 ¥19.9 智能版
//  - 高端定制需求: 引导到 /contact 留定制服务 (独立流程, 非 ¥999 标准产品)
//  - 后端: 'expert' plan 保留 (兼容历史订单, 已支付的不能丢), 但 UI 不再推荐
//  - UI 看到的唯一价格 = ¥19.9
//
// 改版 v4 (2026-07-31, 完全下架):
//  - expert.plan name/description 改为「已下架」占位, 避免任何 API/管理后台误暴露
//  - 历史订单显示走 config.ts 的 PLAN_DISPLAY 映射到「智能版」

export const PLAN_IDS = ['ai', 'expert'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export interface PlanPricing {
  id: PlanId;
  name: string;
  priceCents: number;        // price in 分 (e.g. 1990 = ¥19.90)
  description: string;
  promo?: boolean;
  promoText?: string;
  perTime?: boolean;
  /** 改版 v3: UI 是否展示给新用户 (false = 隐藏, 仅保留后端兼容) */
  showInUI?: boolean;
}

export const PRICING: Record<PlanId, PlanPricing> = {
  ai: {
    id: 'ai',
    name: '智能版',
    priceCents: 1990,            // ¥19.90
    description: '问卷+生成草稿+PDF',
    promo: true,
    promoText: '限时优惠',
    showInUI: true,
  },
  expert: {
    id: 'expert',
    name: '已下架',              // 改版 v4: 不再暴露 专家护航版 / ¥999 字样
    priceCents: 99900,           // 历史订单价格 (数据库内金额不变, 仅展示/前端禁用)
    description: '已下架',
    showInUI: false,
  },
};

/**
 * 改版 v3: 返回前端可见的套餐列表 (新用户只能看到 ¥19.9).
 */
export function getUIPlans(): PlanPricing[] {
  return Object.values(PRICING).filter((p) => p.showInUI !== false);
}

// 历史 plan 字符串 → 当前 plan 的映射. 用于:
//  (a) 旧订单/老数据 (DB 中 'lawyer' 旧值)
//  (b) URL 参数兼容 (?plan=lawyer 仍能跳转, 内部转 expert)
export function normalizePlan(plan: string | null | undefined): PlanId | null {
  if (!plan) return null;
  const lower = plan.toLowerCase();
  if (lower === 'ai') return 'ai';
  if (lower === 'expert' || lower === 'lawyer') return 'expert';
  if (lower === 'family') return null; // 已下架
  return null;
}

/**
 * Look up the price (in 分) for a given plan id. Returns null when the
 * plan id is unknown. Server-side code MUST use this and never trust a
 * client-supplied `amount` field.
 */
export function getPriceCents(plan: string): number | null {
  if ((PLAN_IDS as readonly string[]).includes(plan)) {
    return PRICING[plan as PlanId].priceCents;
  }
  return null;
}
