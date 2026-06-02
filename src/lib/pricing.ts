// Authoritative server-side pricing. Prices are in 分 (cents) to avoid
// floating-point money bugs. The client is NEVER trusted to supply a price:
// create-order must look up the amount here based on the requested plan.

export const PLAN_IDS = ['ai', 'lawyer', 'family'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export interface PlanPricing {
  id: PlanId;
  name: string;
  priceCents: number;        // price in 分 (e.g. 1990 = ¥19.90)
  description: string;
  promo?: boolean;
  promoText?: string;
  perTime?: boolean;         // true = subscription (e.g. 家庭年度版)
}

export const PRICING: Record<PlanId, PlanPricing> = {
  ai: {
    id: 'ai',
    name: 'AI专属版',
    priceCents: 1990,            // ¥19.90
    description: '问卷+生成草稿+PDF',
    promo: true,
    promoText: '限时优惠',
  },
  lawyer: {
    id: 'lawyer',
    name: '律师护航版',
    priceCents: 99900,           // ¥999.00
    description: 'AI生成+律师视频审核+签署指引',
  },
  family: {
    id: 'family',
    name: '家庭年度版',
    priceCents: 469900,          // ¥4699.00
    description: '全家族规划+年度律师顾问',
    perTime: true,
  },
};

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
