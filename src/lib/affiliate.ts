/**
 * 博主系统核心业务逻辑.
 *
 * 核心能力:
 *  - 博主申请 / 审核
 *  - 佣金计算 / 写入 / 状态机管理
 *  - 提现申请 / 审批
 *  - dashboard 数据聚合
 *
 * 状态机 (commissions):
 *   pending → available  (T+7, sync_commission_availability() 触发)
 *   pending/available → voided  (订单退款时, void_commission_for_order())
 *   available → withdrawn  (提现审批通过时)
 *
 * 状态机 (bloggers):
 *   pending → approved/rejected  (管理员审核时)
 *   approved → disabled  (违规时)
 *
 * 状态机 (withdrawals):
 *   pending → approved/paid/rejected/cancelled
 */
import { supabaseAdmin } from './supabase-server';
import { getRefFromCookie } from './affiliate-cookie';

// =============================================================================
// 类型定义
// =============================================================================

export type BloggerStatus = 'pending' | 'approved' | 'rejected' | 'disabled';
export type CommissionStatus = 'pending' | 'available' | 'withdrawn' | 'voided';
export type WithdrawalStatus = 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';
export type WithdrawalMethod = 'alipay' | 'wechat' | 'bank';

/**
 * tier-2 间推佣金率 (basis points, 1000 = 10%).
 * 3% 适用于: 间推作为奖励, 鼓励顶级博主带新人, 同时不影响直接推广者收入.
 * 由 migration 0013 配套, application 层可在此常量调整 (无需 DB schema 改动).
 */
export const TIER2_RATE_BPS = 300;

export interface Blogger {
  id: string;
  user_id: string;
  ref_code: string | null;
  display_name: string | null;
  contact_phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  status: BloggerStatus;
  commission_rate: number; // basis points, 1000 = 10%
  parent_blogger_id: string | null;  // 上级博主 (Migration 0013 新增)
  applied_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  total_earned_cents: number;
  total_withdrawn_cents: number;
  available_cents: number;
  created_at: string;
  updated_at: string;
}

export interface AffiliateClick {
  id: number;
  ref_code: string;
  blogger_id: string | null;
  ip: string | null;
  user_agent: string | null;
  landing_path: string;
  openid: string | null;
  converted_at: string | null;
  order_id: string | null;
  created_at: string;
}

export interface Commission {
  id: string;
  blogger_id: string;
  order_id: string;
  order_amount_cents: number;
  rate: number;
  commission_cents: number;
  status: CommissionStatus;
  tier: 1 | 2;                          // 1 = 直接, 2 = 间推 (Migration 0013)
  referred_blogger_id: string | null;   // tier-2: 触发该笔的下级博主 id
  available_at: string;
  voided_at: string | null;
  voided_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Withdrawal {
  id: string;
  blogger_id: string;
  amount_cents: number;
  commission_ids: string[];
  contact_method: WithdrawalMethod;
  contact_info: string;
  status: WithdrawalStatus;
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
  process_note: string | null;
  payment_proof_url: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// 博主申请 / 查询
// =============================================================================

/**
 * 申请成为博主.
 * 1 个用户 1 条申请 (DB UNIQUE 约束保证).
 * 状态固定为 'pending', ref_code 为 NULL (审核通过后生成).
 *
 * tier-2 关联: 如果传 parentRefCode, 校验其指向一个已审核博主, 写入 parent_blogger_id.
 * 不传 → 顶级博主 (没有上级, 永远不会获得 tier-2 佣金).
 *
 * 自指防御: 用户的 parentRefCode 不能指向自己 (DB 约束 chk_bloggers_no_self_parent 兜底).
 * 循环防御: 不在本函数处理. (申请是单向的, 一旦 A 申请了 B 的 parent, A 不能再申请 C 的 parent
 *   —— 顶级条件: 仅在用户首次申请时设置 parent_blogger_id, 之后不可改. 由 RLS 约束保证.)
 */
export async function applyForBlogger(params: {
  userId: string;
  displayName: string;
  contactPhone: string;
  bio?: string;
  avatarUrl?: string;
  parentRefCode?: string | null;
}): Promise<{ success: boolean; blogger?: Blogger; reason?: string }> {
  if (!supabaseAdmin) return { success: false, reason: 'DB 未配置' };

  // 校验: 用户是否已有申请
  const { data: existing } = await supabaseAdmin
    .from('bloggers')
    .select('id, status')
    .eq('user_id', params.userId)
    .maybeSingle();

  if (existing) {
    return { success: false, reason: `您已申请过 (状态: ${existing.status}), 无需重复提交` };
  }

  // 解析 parentRefCode → parent_blogger_id (如提供)
  let parentBloggerId: string | null = null;
  if (params.parentRefCode) {
    const parent = await getBloggerByRefCode(params.parentRefCode);
    if (!parent) {
      return { success: false, reason: '上级推广码无效或博主未通过审核' };
    }
    parentBloggerId = parent.id;
    // 防御: 自己不能推荐自己 (理论上 userId 不同, 但 ref_code 唯一, 不会冲突)
  }

  // INSERT
  const { data, error } = await supabaseAdmin
    .from('bloggers')
    .insert({
      user_id: params.userId,
      display_name: params.displayName,
      contact_phone: params.contactPhone,
      bio: params.bio,
      avatar_url: params.avatarUrl,
      status: 'pending',
      parent_blogger_id: parentBloggerId,
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    console.error('applyForBlogger error:', error);
    return { success: false, reason: error?.message || '申请失败' };
  }

  return { success: true, blogger: data as Blogger };
}

export async function getBloggerByUserId(userId: string): Promise<Blogger | null> {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin
    .from('bloggers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return (data as Blogger) || null;
}

export async function getBloggerByRefCode(refCode: string): Promise<Blogger | null> {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin
    .from('bloggers')
    .select('*')
    .eq('ref_code', refCode)
    .eq('status', 'approved')
    .maybeSingle();
  return (data as Blogger) || null;
}

// =============================================================================
// 管理员审核
// =============================================================================

/**
 * 审核博主申请. approved → 生成 ref_code; rejected → 填 review_note.
 */
export async function reviewBlogger(params: {
  bloggerId: string;
  adminId: string;
  decision: 'approved' | 'rejected';
  commissionRate?: number; // basis points, approved 时可指定
  reviewNote?: string;
}): Promise<{ success: boolean; blogger?: Blogger; reason?: string }> {
  if (!supabaseAdmin) return { success: false, reason: 'DB 未配置' };

  // 1. 查现有申请
  const { data: existing } = await supabaseAdmin
    .from('bloggers')
    .select('*')
    .eq('id', params.bloggerId)
    .maybeSingle();

  if (!existing) return { success: false, reason: '申请不存在' };
  if (existing.status !== 'pending') {
    return { success: false, reason: `已审核 (${existing.status}), 不可重复审核` };
  }

  // 2. 生成 ref_code (approved 时)
  let refCode: string | null = null;
  if (params.decision === 'approved') {
    const { data: code, error: rpcError } = await supabaseAdmin.rpc('generate_ref_code');
    if (rpcError || !code) {
      console.error('generate_ref_code error:', rpcError);
      return { success: false, reason: 'ref_code 生成失败' };
    }
    refCode = code as string;
  }

  // 3. 更新
  const updates: Partial<Blogger> = {
    status: params.decision,
    reviewed_at: new Date().toISOString(),
    reviewed_by: params.adminId,
    review_note: params.reviewNote,
  };
  if (refCode) updates.ref_code = refCode;
  if (params.commissionRate !== undefined) updates.commission_rate = params.commissionRate;

  const { data, error } = await supabaseAdmin
    .from('bloggers')
    .update(updates)
    .eq('id', params.bloggerId)
    .select()
    .maybeSingle();

  if (error || !data) {
    console.error('reviewBlogger error:', error);
    return { success: false, reason: error?.message || '审核失败' };
  }

  return { success: true, blogger: data as Blogger };
}

// =============================================================================
// 佣金计算
// =============================================================================

/**
 * 计算佣金金额.
 * @param orderAmountCents 订单金额 (分)
 * @param rate 佣金比例 (basis points, 1000 = 10%)
 * @returns 佣金金额 (分, 已 floor)
 */
export function calculateCommission(orderAmountCents: number, rate: number): number {
  return Math.floor((orderAmountCents * rate) / 10000);
}

/**
 * 订单 paid 后调用, 创建 commission 记录 (tier-1 + 可选 tier-2).
 *
 * 流程:
 *  1. 从 cookie 读 ref_code
 *  2. 查 blogger (必须 approved)
 *  3. tier-1: 计算 commission, INSERT commissions (status='pending', available_at=now+7d, tier=1)
 *  4. tier-2: 如 blogger.parent_blogger_id 非空, 再插入一条 tier-2 佣金给上级
 *  5. 累加各博主 total_earned_cents
 *
 * 幂等: 1 订单 1 tier 最多 1 条, 由 UNIQUE(order_id, tier) 约束保证. 重复调用:
 *   - 若 tier-1 已存在, 短路返回; 但 tier-2 可能未创建, 会尝试补建 (再幂等)
 */
export async function createCommissionForOrder(params: {
  orderId: string;
  orderAmountCents: number;
}): Promise<{ success: boolean; commission?: Commission; reason?: string }> {
  if (!supabaseAdmin) return { success: false, reason: 'DB 未配置' };

  // 1. 幂等: 检查 tier-1 是否已存在
  const { data: existingTier1 } = await supabaseAdmin
    .from('commissions')
    .select('*')
    .eq('order_id', params.orderId)
    .eq('tier', 1)
    .maybeSingle();

  if (existingTier1) {
    // tier-1 已存在, 检查 tier-2 是否也需补建
    await maybeCreateTier2Commission({
      orderId: params.orderId,
      orderAmountCents: params.orderAmountCents,
      directBloggerId: existingTier1.blogger_id,
    });
    return { success: true, commission: existingTier1 as Commission, reason: '佣金已存在' };
  }

  // 2. 读 ref_code
  const refCode = await getRefFromCookie();
  if (!refCode) {
    return { success: false, reason: '无推广 cookie' };
  }

  // 3. 查 blogger
  const blogger = await getBloggerByRefCode(refCode);
  if (!blogger) {
    return { success: false, reason: '推广码无效或博主未通过审核' };
  }

  // 4. 计算 tier-1 佣金
  const commissionCents = calculateCommission(params.orderAmountCents, blogger.commission_rate);
  if (commissionCents <= 0) {
    return { success: false, reason: '订单金额过低, 无佣金' };
  }

  // 5. INSERT tier-1
  const availableAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from('commissions')
    .insert({
      blogger_id: blogger.id,
      order_id: params.orderId,
      order_amount_cents: params.orderAmountCents,
      rate: blogger.commission_rate,
      commission_cents: commissionCents,
      status: 'pending',
      tier: 1,
      referred_blogger_id: null,
      available_at: availableAt,
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    console.error('createCommissionForOrder (tier-1) error:', error);
    return { success: false, reason: error?.message || '佣金写入失败' };
  }

  // 6. 累加博主 total_earned_cents
  await supabaseAdmin
    .from('bloggers')
    .update({ total_earned_cents: blogger.total_earned_cents + commissionCents })
    .eq('id', blogger.id);

  // 7. 尝试补建 tier-2 (如 direct blogger 有上级)
  await maybeCreateTier2Commission({
    orderId: params.orderId,
    orderAmountCents: params.orderAmountCents,
    directBloggerId: blogger.id,
  });

  return { success: true, commission: data as Commission };
}

/**
 * 内部辅助: 给直接博主的上级补建一条 tier-2 commission.
 *  - 没有上级 → 跳过
 *  - 上级未审核 → 跳过
 *  - tier-2 已存在 (幂等) → 跳过
 *  - amount 太低 (低于 1 分) → 跳过
 */
async function maybeCreateTier2Commission(params: {
  orderId: string;
  orderAmountCents: number;
  directBloggerId: string;
}): Promise<void> {
  if (!supabaseAdmin) return;

  // 1. 查 direct blogger 的 parent
  const { data: directBlogger } = await supabaseAdmin
    .from('bloggers')
    .select('id, parent_blogger_id')
    .eq('id', params.directBloggerId)
    .maybeSingle();

  if (!directBlogger?.parent_blogger_id) return;

  // 2. 查 parent 是否 approved (top-level 不一定有)
  const { data: parent } = await supabaseAdmin
    .from('bloggers')
    .select('id, status, total_earned_cents')
    .eq('id', directBlogger.parent_blogger_id)
    .maybeSingle();

  if (!parent || parent.status !== 'approved') return;

  // 3. 幂等: tier-2 是否已存在
  const { data: existingTier2 } = await supabaseAdmin
    .from('commissions')
    .select('id')
    .eq('order_id', params.orderId)
    .eq('tier', 2)
    .maybeSingle();

  if (existingTier2) return;

  // 4. 计算 tier-2 佣金
  const tier2Cents = calculateCommission(params.orderAmountCents, TIER2_RATE_BPS);
  if (tier2Cents <= 0) return;

  // 5. INSERT tier-2
  const availableAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabaseAdmin
    .from('commissions')
    .insert({
      blogger_id: parent.id,
      order_id: params.orderId,
      order_amount_cents: params.orderAmountCents,
      rate: TIER2_RATE_BPS,
      commission_cents: tier2Cents,
      status: 'pending',
      tier: 2,
      referred_blogger_id: params.directBloggerId,
      available_at: availableAt,
    });

  if (error) {
    // tier-2 失败不影响主流程, 仅日志
    console.error('createCommissionForOrder (tier-2) error:', error);
    return;
  }

  // 6. 累加 parent total_earned_cents
  await supabaseAdmin
    .from('bloggers')
    .update({ total_earned_cents: parent.total_earned_cents + tier2Cents })
    .eq('id', parent.id);
}

// =============================================================================
// 订单退款时撤回佣金
// =============================================================================

/**
 * 订单退款时调用. voided 佣金 + 扣减博主 available_cents.
 * (状态机: pending/available → voided)
 */
export async function voidCommissionForOrder(params: {
  orderId: string;
  reason: string;
}): Promise<{ success: boolean; reason?: string }> {
  if (!supabaseAdmin) return { success: false, reason: 'DB 未配置' };

  const { data, error } = await supabaseAdmin.rpc('void_commission_for_order', {
    p_order_id: params.orderId,
    p_reason: params.reason,
  });

  if (error) {
    console.error('voidCommissionForOrder error:', error);
    return { success: false, reason: error.message };
  }

  return { success: true };
}

// =============================================================================
// 佣金可用性同步 (T+7)
// =============================================================================

/**
 * 将过期 pending 佣金批量提升为 available.
 * 每次博主 dashboard 加载时调用 (兜底, 等同 cron).
 */
export async function syncCommissionAvailability(): Promise<number> {
  if (!supabaseAdmin) return 0;
  const { data, error } = await supabaseAdmin.rpc('sync_commission_availability');
  if (error) {
    console.error('syncCommissionAvailability error:', error);
    return 0;
  }
  return (data as number) || 0;
}

// =============================================================================
// 提现
// =============================================================================

const MIN_WITHDRAWAL_CENTS = 5000; // ¥50 (改版 v1.0, 2026-07-24 · 工作室批准)

/**
 * 申请提现.
 * 1. 检查余额 ≥ amount + ≥ ¥10
 * 2. INSERT withdrawal (status='pending')
 * 3. (不在此处扣减 available_cents, 等管理员审批通过后再扣)
 */
export async function requestWithdrawal(params: {
  bloggerId: string;
  amountCents: number;
  contactMethod: WithdrawalMethod;
  contactInfo: string;
}): Promise<{ success: boolean; withdrawal?: Withdrawal; reason?: string }> {
  if (!supabaseAdmin) return { success: false, reason: 'DB 未配置' };

  if (params.amountCents < MIN_WITHDRAWAL_CENTS) {
    return { success: false, reason: `最低提现 ¥${MIN_WITHDRAWAL_CENTS / 100}` };
  }

  // 1. 检查余额
  const { data: blogger } = await supabaseAdmin
    .from('bloggers')
    .select('id, status, available_cents')
    .eq('id', params.bloggerId)
    .maybeSingle();

  if (!blogger || blogger.status !== 'approved') {
    return { success: false, reason: '博主不存在或未通过审核' };
  }
  if (blogger.available_cents < params.amountCents) {
    return { success: false, reason: `余额不足 (可提现 ¥${(blogger.available_cents / 100).toFixed(2)})` };
  }

  // 2. 查所有 available 状态的 commission (按时间排序, 先入先出)
  const { data: availableCommissions } = await supabaseAdmin
    .from('commissions')
    .select('id, commission_cents')
    .eq('blogger_id', params.bloggerId)
    .eq('status', 'available')
    .order('created_at', { ascending: true });

  if (!availableCommissions || availableCommissions.length === 0) {
    return { success: false, reason: '没有可提现的佣金' };
  }

  // 3. 选出累计 ≥ amountCents 的 commission
  let acc = 0;
  const usedIds: string[] = [];
  for (const c of availableCommissions) {
    acc += c.commission_cents;
    usedIds.push(c.id);
    if (acc >= params.amountCents) break;
  }
  if (acc < params.amountCents) {
    return { success: false, reason: '可提现佣金不足' };
  }

  // 4. INSERT withdrawal
  const { data, error } = await supabaseAdmin
    .from('withdrawals')
    .insert({
      blogger_id: params.bloggerId,
      amount_cents: params.amountCents,
      commission_ids: usedIds,
      contact_method: params.contactMethod,
      contact_info: params.contactInfo,
      status: 'pending',
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    console.error('requestWithdrawal error:', error);
    return { success: false, reason: error?.message || '提现申请失败' };
  }

  return { success: true, withdrawal: data as Withdrawal };
}

/**
 * 管理员审批提现.
 *  - approved: 状态 → approved (待打款, 暂不扣余额)
 *  - paid: 状态 → paid (已打款, 扣 available_cents, 累计 total_withdrawn, commission → withdrawn)
 *  - rejected: 状态 → rejected (余额不动, commission 不动)
 */
export async function processWithdrawal(params: {
  withdrawalId: string;
  adminId: string;
  decision: 'approved' | 'paid' | 'rejected';
  processNote?: string;
  paymentProofUrl?: string;
}): Promise<{ success: boolean; withdrawal?: Withdrawal; reason?: string }> {
  if (!supabaseAdmin) return { success: false, reason: 'DB 未配置' };

  // 1. 查现有
  const { data: existing } = await supabaseAdmin
    .from('withdrawals')
    .select('*')
    .eq('id', params.withdrawalId)
    .maybeSingle();

  if (!existing) return { success: false, reason: '提现申请不存在' };

  // 2. 状态机检查
  if (params.decision === 'paid' && existing.status !== 'approved') {
    return { success: false, reason: '仅 approved 状态可标记 paid' };
  }
  if (params.decision === 'approved' && existing.status !== 'pending') {
    return { success: false, reason: '仅 pending 状态可审批' };
  }
  if (params.decision === 'rejected' && !['pending', 'approved'].includes(existing.status)) {
    return { success: false, reason: '当前状态不可拒绝' };
  }

  // 3. paid 时: 扣 available_cents, 累计 total_withdrawn, commission → withdrawn
  if (params.decision === 'paid') {
    const commissionIds = (existing.commission_ids as string[]) || [];
    if (commissionIds.length > 0) {
      // 3a. 改 commission 状态
      await supabaseAdmin
        .from('commissions')
        .update({ status: 'withdrawn' })
        .in('id', commissionIds);

      // 3b. 扣博主 available_cents + 累计 total_withdrawn
      const { data: blogger } = await supabaseAdmin
        .from('bloggers')
        .select('available_cents, total_withdrawn_cents')
        .eq('id', existing.blogger_id)
        .maybeSingle();

      if (blogger) {
        await supabaseAdmin
          .from('bloggers')
          .update({
            available_cents: Math.max(0, blogger.available_cents - existing.amount_cents),
            total_withdrawn_cents: blogger.total_withdrawn_cents + existing.amount_cents,
          })
          .eq('id', existing.blogger_id);
      }
    }
  }

  // 4. 更新 withdrawal
  const updates: Partial<Withdrawal> = {
    status: params.decision,
    processed_at: new Date().toISOString(),
    processed_by: params.adminId,
    process_note: params.processNote,
  };
  if (params.paymentProofUrl) updates.payment_proof_url = params.paymentProofUrl;

  const { data, error } = await supabaseAdmin
    .from('withdrawals')
    .update(updates)
    .eq('id', params.withdrawalId)
    .select()
    .maybeSingle();

  if (error || !data) {
    console.error('processWithdrawal error:', error);
    return { success: false, reason: error?.message || '处理失败' };
  }

  return { success: true, withdrawal: data as Withdrawal };
}

// =============================================================================
// 博主 dashboard 数据
// =============================================================================

export interface BloggerDashboard {
  blogger: Blogger;
  stats: {
    total_clicks: number;
    total_conversions: number;
    total_commission: number;       // sum of all commission (含 pending/available/withdrawn)
    available_commission: number;   // sum of available
    pending_commission: number;     // sum of pending
    withdrawn_commission: number;   // sum of withdrawn
    voided_commission: number;      // sum of voided
    recent_commissions: Commission[];
    recent_clicks: AffiliateClick[];
    pending_withdrawal_amount: number;
    // tier-2 (二级分销) 统计
    tier1_commission: number;       // 直接佣金总额
    tier2_commission: number;       // 间推佣金总额 (来自下级博主)
    tier2_recent: Commission[];     // 最近 5 条 tier-2 佣金
    downline_count: number;         // 下级博主数量
  };
}

export async function getBloggerDashboard(bloggerId: string): Promise<BloggerDashboard | null> {
  if (!supabaseAdmin) return null;

  // 兜底: 先同步 pending → available
  await syncCommissionAvailability();

  // 1. 查博主
  const { data: blogger } = await supabaseAdmin
    .from('bloggers')
    .select('*')
    .eq('id', bloggerId)
    .maybeSingle();

  if (!blogger) return null;

  // 2. 统计 clicks
  const { count: totalClicks } = await supabaseAdmin
    .from('affiliate_clicks')
    .select('*', { count: 'exact', head: true })
    .eq('blogger_id', bloggerId);

  const { count: totalConversions } = await supabaseAdmin
    .from('affiliate_clicks')
    .select('*', { count: 'exact', head: true })
    .eq('blogger_id', bloggerId)
    .not('converted_at', 'is', null);

  // 3. 佣金汇总 (按状态, 含 tier-1/2 拆分)
  const { data: commissionRows } = await supabaseAdmin
    .from('commissions')
    .select('status, commission_cents, tier')
    .eq('blogger_id', bloggerId);

  let totalCommission = 0;
  let availableCommission = 0;
  let pendingCommission = 0;
  let withdrawnCommission = 0;
  let voidedCommission = 0;
  let tier1Commission = 0;
  let tier2Commission = 0;
  for (const c of commissionRows || []) {
    totalCommission += c.commission_cents;
    if (c.status === 'available') availableCommission += c.commission_cents;
    else if (c.status === 'pending') pendingCommission += c.commission_cents;
    else if (c.status === 'withdrawn') withdrawnCommission += c.commission_cents;
    else if (c.status === 'voided') voidedCommission += c.commission_cents;
    if (c.tier === 1) tier1Commission += c.commission_cents;
    else if (c.tier === 2) tier2Commission += c.commission_cents;
  }

  // 4. 最近 10 条佣金
  const { data: recentCommissions } = await supabaseAdmin
    .from('commissions')
    .select('*')
    .eq('blogger_id', bloggerId)
    .order('created_at', { ascending: false })
    .range(0, 9);

  // 4b. 最近 5 条 tier-2 佣金
  const { data: tier2Recent } = await supabaseAdmin
    .from('commissions')
    .select('*')
    .eq('blogger_id', bloggerId)
    .eq('tier', 2)
    .order('created_at', { ascending: false })
    .range(0, 4);

  // 5. 最近 20 条点击
  const { data: recentClicks } = await supabaseAdmin
    .from('affiliate_clicks')
    .select('*')
    .eq('blogger_id', bloggerId)
    .order('created_at', { ascending: false })
    .range(0, 19);

  // 6. 待审批提现金额
  const { data: pendingWithdrawals } = await supabaseAdmin
    .from('withdrawals')
    .select('amount_cents')
    .eq('blogger_id', bloggerId)
    .eq('status', 'pending');

  const pendingWithdrawalAmount = (pendingWithdrawals || []).reduce(
    (sum, w) => sum + w.amount_cents,
    0
  );

  // 7. 下级博主数量
  const { count: downlineCount } = await supabaseAdmin
    .from('bloggers')
    .select('*', { count: 'exact', head: true })
    .eq('parent_blogger_id', bloggerId);

  return {
    blogger: blogger as Blogger,
    stats: {
      total_clicks: totalClicks || 0,
      total_conversions: totalConversions || 0,
      total_commission: totalCommission,
      available_commission: availableCommission,
      pending_commission: pendingCommission,
      withdrawn_commission: withdrawnCommission,
      voided_commission: voidedCommission,
      recent_commissions: (recentCommissions || []) as Commission[],
      recent_clicks: (recentClicks || []) as AffiliateClick[],
      pending_withdrawal_amount: pendingWithdrawalAmount,
      tier1_commission: tier1Commission,
      tier2_commission: tier2Commission,
      tier2_recent: (tier2Recent || []) as Commission[],
      downline_count: downlineCount || 0,
    },
  };
}

// =============================================================================
// 管理员: 列出所有博主
// =============================================================================

export async function listBloggers(filter?: {
  status?: BloggerStatus;
  limit?: number;
  offset?: number;
}): Promise<{ bloggers: Blogger[]; total: number }> {
  if (!supabaseAdmin) return { bloggers: [], total: 0 };

  let query = supabaseAdmin
    .from('bloggers')
    .select('*', { count: 'exact' });
  if (filter?.status) query = query.eq('status', filter.status);
  query = query
    .order('created_at', { ascending: false })
    .range(filter?.offset || 0, (filter?.offset || 0) + (filter?.limit || 100) - 1);

  const { data, count } = await query;
  return { bloggers: (data || []) as Blogger[], total: count || 0 };
}

export async function listWithdrawals(filter?: {
  status?: WithdrawalStatus;
  bloggerId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ withdrawals: Withdrawal[]; total: number }> {
  if (!supabaseAdmin) return { withdrawals: [], total: 0 };

  let query = supabaseAdmin
    .from('withdrawals')
    .select('*', { count: 'exact' });
  if (filter?.status) query = query.eq('status', filter.status);
  if (filter?.bloggerId) query = query.eq('blogger_id', filter.bloggerId);
  query = query
    .order('requested_at', { ascending: false })
    .range(filter?.offset || 0, (filter?.offset || 0) + (filter?.limit || 100) - 1);

  const { data, count } = await query;
  return { withdrawals: (data || []) as Withdrawal[], total: count || 0 };
}

// =============================================================================
// 二级分销: 下级博主管理
// =============================================================================

/**
 * 列出某博主的所有直接下级 (parent_blogger_id = bloggerId).
 * 含累计收入统计 (供博主 dashboard "我的团队" 展示).
 */
export interface DownlineRow {
  blogger_id: string;
  ref_code: string | null;
  display_name: string | null;
  status: BloggerStatus;
  created_at: string;
  total_earned_cents: number;       // 该下级的 total_earned_cents (本人所有佣金)
  tier1_commission: number;         // 该下级产生的 tier-1 佣金 (间接 = 我的 tier-2 收入源)
  tier2_paid_to_me: number;         // 我从该下级获得的 tier-2 收入
}

export async function getDownline(bloggerId: string): Promise<DownlineRow[]> {
  if (!supabaseAdmin) return [];

  // 1. 查所有直接下级
  const { data: downlines } = await supabaseAdmin
    .from('bloggers')
    .select('id, ref_code, display_name, status, created_at, total_earned_cents')
    .eq('parent_blogger_id', bloggerId)
    .order('created_at', { ascending: false });

  if (!downlines || downlines.length === 0) return [];

  // 2. 统计每个下级产生的 tier-1 佣金 (汇总)
  const downlineIds = downlines.map((d) => d.id);
  const { data: tier1Rows } = await supabaseAdmin
    .from('commissions')
    .select('blogger_id, commission_cents')
    .eq('tier', 1)
    .in('blogger_id', downlineIds);

  const tier1ByBlogger: Record<string, number> = {};
  for (const r of tier1Rows || []) {
    tier1ByBlogger[r.blogger_id] = (tier1ByBlogger[r.blogger_id] || 0) + r.commission_cents;
  }

  // 3. 统计我从每个下级拿到的 tier-2 佣金
  const { data: tier2Rows } = await supabaseAdmin
    .from('commissions')
    .select('referred_blogger_id, commission_cents')
    .eq('tier', 2)
    .eq('blogger_id', bloggerId)
    .in('referred_blogger_id', downlineIds);

  const tier2ByReferred: Record<string, number> = {};
  for (const r of tier2Rows || []) {
    if (r.referred_blogger_id) {
      tier2ByReferred[r.referred_blogger_id] = (tier2ByReferred[r.referred_blogger_id] || 0) + r.commission_cents;
    }
  }

  return downlines.map((d) => ({
    blogger_id: d.id,
    ref_code: d.ref_code,
    display_name: d.display_name,
    status: d.status,
    created_at: d.created_at,
    total_earned_cents: d.total_earned_cents,
    tier1_commission: tier1ByBlogger[d.id] || 0,
    tier2_paid_to_me: tier2ByReferred[d.id] || 0,
  }));
}

// =============================================================================
// 点击流水 (供 middleware 调用)
// =============================================================================

/**
 * 记录一次推广点击.
 * 由 middleware 在检测到 ?ref=xxx 时调用.
 */
export async function recordAffiliateClick(params: {
  refCode: string;
  ip: string | null;
  userAgent: string | null;
  landingPath: string;
  openid?: string | null;
}): Promise<void> {
  if (!supabaseAdmin) return;

  // 查 blogger_id (允许为 NULL, ref_code 可能暂时未审核)
  const { data: blogger } = await supabaseAdmin
    .from('bloggers')
    .select('id')
    .eq('ref_code', params.refCode)
    .maybeSingle();

  await supabaseAdmin.from('affiliate_clicks').insert({
    ref_code: params.refCode,
    blogger_id: blogger?.id || null,
    ip: params.ip,
    user_agent: params.userAgent,
    landing_path: params.landingPath,
    openid: params.openid || null,
  });
}
