/**
 * A/B 测试核心库.
 *
 * 设计:
 *  - 服务端读 cookie 决定变体 (避免闪烁)
 *  - 分配使用 SHA-256 哈希 → 取模 → 均匀分布
 *  - 事件通过 /api/ab/event 异步上报
 *  - 同一 user_key 在同实验内变体稳定 (cookie 30 天有效)
 *
 * 用法:
 *  // 服务端
 *  const variant = await getVariant('payment_cta_v1', { A: 50, B: 50 });
 *  if (variant === 'A') ctaText = '立即支付';
 *  else ctaText = '限时立省, 立即支付';
 *
 *  // 客户端
 *  trackEvent('payment_cta_v1', variant, 'click');
 */
import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { getOpenidFromCookie } from './cookie';
import { supabaseAdmin } from './supabase-server';

// =============================================================================
// 已知实验配置 (硬编码, 简单可控)
// =============================================================================

export interface ExperimentConfig {
  name: string;
  description: string;
  variants: Record<string, number>; // 权重 (总和 = 100)
  started_at: string;                 // ISO date
}

export const EXPERIMENTS: Record<string, ExperimentConfig> = {
  payment_cta_v1: {
    name: 'payment_cta_v1',
    description: '支付页 CTA 文案价格心理学测试',
    started_at: '2026-06-07',
    variants: {
      // A 控制: 简洁直接
      A: 33,
      // B 锚定: 专家版对比 (原价 ¥999, AI 版立省 ¥980)
      B: 33,
      // C 社会证明: 1000+ 用户选择
      C: 34,
    },
  },
  // 未来实验在此添加
  // questionnaire_wording_v1: { ... }
};

export const VARIANT_CONTENT: Record<string, Record<string, string>> = {
  payment_cta_v1: {
    A: '我已支付 · 请客服确认',
    B: '我已支付, 立省 ¥980',
    C: '我已支付, 与 1000+ 用户同行',
  },
};

// =============================================================================
// 服务端: 变体分配
// =============================================================================

/**
 * 读 cookie 中的稳定 user_key (匿名 ID), 缺则用 openid 或随机生成.
 */
export async function getUserKey(): Promise<string> {
  const cookieStore = await cookies();

  // 1. 优先: 显式 ab_uid cookie
  const abUid = cookieStore.get('ab_uid')?.value;
  if (abUid) return abUid;

  // 2. 退化: openid (已登录用户)
  const openid = await getOpenidFromCookie();
  if (openid) return `oid:${openid}`;

  // 3. 兜底: 客户端首次请求时由 /api/ab/assign 写入 ab_uid cookie
  return 'anon:no-cookie';
}

/**
 * 根据 user_key + 实验名 + 权重, 稳定分配变体.
 * 优先读 cookie, 否则哈希分配.
 */
export function pickVariant(
  userKey: string,
  experimentName: string,
  variants: Record<string, number>
): string {
  const hash = createHash('sha256')
    .update(`${experimentName}:${userKey}`)
    .digest();
  // 取前 4 字节转 uint32, 对 100 取模
  const num = hash.readUInt32BE(0) % 100;

  let acc = 0;
  for (const [variant, weight] of Object.entries(variants)) {
    acc += weight;
    if (num < acc) return variant;
  }
  // 兜底返回第一个
  return Object.keys(variants)[0];
}

export async function getVariant(
  experimentName: string
): Promise<string | null> {
  const cfg = EXPERIMENTS[experimentName];
  if (!cfg) return null;

  const cookieStore = await cookies();
  // 读已分配的 cookie
  const cookieName = `ab_${experimentName}`;
  const assigned = cookieStore.get(cookieName)?.value;
  if (assigned && cfg.variants[assigned] !== undefined) {
    return assigned;
  }

  // 哈希分配
  const userKey = await getUserKey();
  const variant = pickVariant(userKey, experimentName, cfg.variants);
  return variant;
}

// =============================================================================
// 事件记录 (服务端 + 客户端)
// =============================================================================

export async function trackEventServer(params: {
  experimentName: string;
  variant: string;
  eventType: 'impression' | 'click' | 'conversion';
  userKey: string;
  value?: number;
  path?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from('ab_events').insert({
    experiment_name: params.experimentName,
    variant: params.variant,
    event_type: params.eventType,
    user_key: params.userKey,
    value: params.value,
    path: params.path,
    metadata: params.metadata || {},
  });
}
