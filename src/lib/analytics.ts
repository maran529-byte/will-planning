/**
 * 数据看板 V2 数据查询.
 *
 * 所有查询都按 Supabase 实际表 (orders, affiliate_clicks, commissions) 聚合.
 * 7 天/30 天维度, 服务端使用 now() 起点.
 */
import { supabaseAdmin } from './supabase-server';

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  orders: number;
  paid: number;
  gmv_cents: number;
}

export interface FunnelPoint {
  step: string;
  count: number;
  rate: number; // 0..1
}

export interface PlanDistribution {
  plan: string;
  count: number;
  gmv_cents: number;
}

export interface TopBlogger {
  blogger_id: string;
  display_name: string;
  ref_code: string;
  clicks: number;
  conversions: number;
  gmv_cents: number;
  commission_cents: number;
}

// =============================================================================
// GMV / 订单 7 天折线
// =============================================================================

export async function getDailyTrend(days = 7): Promise<DailyPoint[]> {
  if (!supabaseAdmin) return [];

  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);

  // 1. 查所有 paid/pending 订单
  const { data } = await supabaseAdmin
    .from('orders')
    .select('created_at, paid_at, amount, status')
    .gte('created_at', start.toISOString());

  // 2. 按天分组 (用 paid_at 算 paid, created_at 算 orders)
  const byDay = new Map<string, DailyPoint>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, { date: key, orders: 0, paid: 0, gmv_cents: 0 });
  }

  for (const o of data || []) {
    const createdDay = o.created_at?.slice(0, 10);
    if (createdDay && byDay.has(createdDay)) {
      byDay.get(createdDay)!.orders += 1;
    }
    if (o.status === 'paid' && o.paid_at) {
      const paidDay = o.paid_at.slice(0, 10);
      if (paidDay && byDay.has(paidDay)) {
        const p = byDay.get(paidDay)!;
        p.paid += 1;
        p.gmv_cents += o.amount || 0;
      }
    }
  }

  return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// =============================================================================
// 转化漏斗 (用订单数据近似估算)
// =============================================================================

export async function getFunnel(days = 7): Promise<FunnelPoint[]> {
  if (!supabaseAdmin) return [];

  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // 步骤 1: 访问问卷页 (用 affiliate_clicks 数作为上限估算)
  const { count: totalClicks } = await supabaseAdmin
    .from('affiliate_clicks')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', start.toISOString());

  // 步骤 2: 创建订单 (问卷提交后)
  const { count: ordersCreated } = await supabaseAdmin
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', start.toISOString());

  // 步骤 3: 进入支付 (订单 pending)
  const { count: ordersPending } = await supabaseAdmin
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    .gte('created_at', start.toISOString());

  // 步骤 4: 已支付
  const { count: ordersPaid } = await supabaseAdmin
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'paid')
    .gte('paid_at', start.toISOString());

  const top = totalClicks || ordersCreated || 0;
  const safeRate = (n: number) => (top > 0 ? n / top : 0);

  return [
    { step: '访问落地页', count: totalClicks || 0, rate: 1 },
    { step: '创建订单', count: ordersCreated || 0, rate: safeRate(ordersCreated || 0) },
    { step: '进入支付', count: ordersPending || 0, rate: safeRate(ordersPending || 0) },
    { step: '完成支付', count: ordersPaid || 0, rate: safeRate(ordersPaid || 0) },
  ];
}

// =============================================================================
// 套餐分布
// =============================================================================

export async function getPlanDistribution(days = 30): Promise<PlanDistribution[]> {
  if (!supabaseAdmin) return [];
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabaseAdmin
    .from('orders')
    .select('plan, amount, status')
    .eq('status', 'paid')
    .gte('paid_at', start);

  const map = new Map<string, PlanDistribution>();
  for (const o of data || []) {
    const key = o.plan || 'unknown';
    if (!map.has(key)) {
      map.set(key, { plan: key, count: 0, gmv_cents: 0 });
    }
    const p = map.get(key)!;
    p.count += 1;
    p.gmv_cents += o.amount || 0;
  }

  return Array.from(map.values()).sort((a, b) => b.gmv_cents - a.gmv_cents);
}

// =============================================================================
// 头部博主
// =============================================================================

export async function getTopBloggers(days = 30, limit = 5): Promise<TopBlogger[]> {
  if (!supabaseAdmin) return [];
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // 1. 聚合博主 GMV + 佣金
  const { data: commissionRows } = await supabaseAdmin
    .from('commissions')
    .select('blogger_id, order_amount_cents, commission_cents')
    .gte('created_at', start);

  const map = new Map<string, { gmv_cents: number; commission_cents: number }>();
  for (const c of commissionRows || []) {
    if (!map.has(c.blogger_id)) {
      map.set(c.blogger_id, { gmv_cents: 0, commission_cents: 0 });
    }
    const m = map.get(c.blogger_id)!;
    m.gmv_cents += c.order_amount_cents || 0;
    m.commission_cents += c.commission_cents || 0;
  }

  // 2. 查点击 / 转化
  const bloggerIds = Array.from(map.keys());
  if (bloggerIds.length === 0) return [];
  const { data: bloggers } = await supabaseAdmin
    .from('bloggers')
    .select('id, display_name, ref_code')
    .in('id', bloggerIds);

  const { data: clickRows } = await supabaseAdmin
    .from('affiliate_clicks')
    .select('blogger_id, converted_at')
    .in('blogger_id', bloggerIds)
    .gte('created_at', start);

  const clickCount = new Map<string, number>();
  const conversionCount = new Map<string, number>();
  for (const c of clickRows || []) {
    if (!c.blogger_id) continue;
    clickCount.set(c.blogger_id, (clickCount.get(c.blogger_id) || 0) + 1);
    if (c.converted_at) {
      conversionCount.set(c.blogger_id, (conversionCount.get(c.blogger_id) || 0) + 1);
    }
  }

  const results: TopBlogger[] = (bloggers || []).map((b) => ({
    blogger_id: b.id,
    display_name: b.display_name || '(匿名)',
    ref_code: b.ref_code || '—',
    clicks: clickCount.get(b.id) || 0,
    conversions: conversionCount.get(b.id) || 0,
    gmv_cents: map.get(b.id)?.gmv_cents || 0,
    commission_cents: map.get(b.id)?.commission_cents || 0,
  }));

  return results.sort((a, b) => b.gmv_cents - a.gmv_cents).slice(0, limit);
}
