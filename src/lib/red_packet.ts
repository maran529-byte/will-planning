/**
 * 红包系统 (2026-07-24 · 业务铁律 v1.0 + v1.1 转赠)
 *
 * 铁律:
 *   - 单个红包 200-1000 分 (¥2-¥10 随机)
 *   - 分享注册固定 200 分 (¥2, 在范围内)
 *   - 订单使用红包 ≤ 订单金额 50% (硬约束)
 *   - 30 天有效
 *
 * v1.1 转赠 (1.7.5):
 *   - 用户 A 可将红包转给用户 B
 *   - 金额 A 自定义, 但 ≤ A 账户剩余可用红包总额
 *   - 6 位 PIN 验证 (5 次错锁定 1 小时)
 *   - 24h 内可撤销 (B 还未使用)
 */

export const RED_PACKET_MIN_CENTS = 200;   // ¥2
export const RED_PACKET_MAX_CENTS = 1000;  // ¥10
export const RED_PACKET_VALIDITY_DAYS = 30;
export const RED_PACKET_USAGE_CAP_RATIO = 0.50;  // 订单 50% 上限

// v1.1 转赠风控常量
export const TRANSFER_DAILY_COUNT_LIMIT = 3;      // 单用户日转赠次数上限
export const TRANSFER_DAILY_AMOUNT_LIMIT = 3000;  // 单用户日转赠金额上限 (¥30)
export const TRANSFER_REVOKE_WINDOW_HOURS = 24;   // 撤销窗口 (小时)
export const PIN_MAX_ATTEMPTS = 5;                // PIN 错误锁定阈值
export const PIN_LOCKOUT_MINUTES = 60;            // 锁定时长
export const PIN_LENGTH = 6;                      // 6 位数字 PIN

export type RedPacketTrigger =
  | 'order_paid'
  | 'share_referral'
  | 'feedback_adopted'
  | 'questionnaire_done'
  | 'admin_grant'
  | 'share_transfer';  // v1.1: 接收方收到 A 转赠的红包

export interface RedPacket {
  id: string;
  user_id: string;
  amount_cents: number;
  trigger: RedPacketTrigger;
  status: 'issued' | 'used' | 'expired' | 'voided';
  used_amount_cents: number;
  issued_at: string;
  expires_at: string;
  used_at?: string | null;
}

/**
 * 生成随机金额 (前端模拟, 真实金额由后端 RPC issue_red_packet 生成)
 *  - share_referral 固定 ¥2
 *  - 其他触发: 200-1000 分均匀分布
 */
export function randomAmountCents(trigger: RedPacketTrigger): number {
  if (trigger === 'share_referral') return 200;
  if (trigger === 'admin_grant') return 500;
  // 200 + floor(random * 801) ∈ [200, 1000]
  return 200 + Math.floor(Math.random() * 801);
}

/**
 * 计算订单最多可用红包 (订单金额 50%)
 */
export function maxUsableCents(orderAmountCents: number): number {
  return Math.floor(orderAmountCents * RED_PACKET_USAGE_CAP_RATIO);
}

/**
 * 校验使用金额是否合规
 */
export function validateUsage(params: {
  useAmountCents: number;
  orderAmountCents: number;
  userAvailableCents: number;
}): { ok: boolean; reason?: string; maxAllowed: number } {
  const max = maxUsableCents(params.orderAmountCents);
  if (params.useAmountCents > params.userAvailableCents) {
    return { ok: false, reason: '可用红包不足', maxAllowed: max };
  }
  if (params.useAmountCents > max) {
    return { ok: false, reason: `单笔订单最多使用 ¥${(max / 100).toFixed(2)} 红包 (订单金额 50%)`, maxAllowed: max };
  }
  if (params.useAmountCents < 0) {
    return { ok: false, reason: '金额不能为负', maxAllowed: max };
  }
  return { ok: true, maxAllowed: max };
}

/**
 * 用户总可用红包 (未过期未用完)
 */
export function calcAvailableCents(packets: RedPacket[]): number {
  const now = Date.now();
  return packets
    .filter(p => p.status === 'issued' && new Date(p.expires_at).getTime() > now)
    .reduce((sum, p) => sum + (p.amount_cents - p.used_amount_cents), 0);
}

/**
 * 文案: ¥X.XX (用于显示)
 */
export function formatYuan(cents: number): string {
  return '¥' + (cents / 100).toFixed(2);
}

// ============================================================================
// v1.1 转赠 (1.7.5)
// ============================================================================

export interface TransferValidation {
  ok: boolean;
  reason?: string;
  maxAllowed?: number;
}

/**
 * 校验转赠金额是否合规
 *  1. 金额在 [200, 1000] 区间
 *  2. 金额 ≤ A 账户剩余可用红包总额 (硬约束)
 *  3. 金额 ≤ 当日累计已转赠 + 本次 (日上限 ¥30)
 *  4. 不能转给自己 (调用方校验)
 */
export function validateTransferAmount(params: {
  amountCents: number;
  fromAvailableCents: number;
  fromDailyTransferredCents: number;
}): TransferValidation {
  const { amountCents, fromAvailableCents, fromDailyTransferredCents } = params;

  if (amountCents < RED_PACKET_MIN_CENTS || amountCents > RED_PACKET_MAX_CENTS) {
    return {
      ok: false,
      reason: `单次转赠金额需在 ¥${RED_PACKET_MIN_CENTS / 100} ~ ¥${RED_PACKET_MAX_CENTS / 100} 之间`,
      maxAllowed: Math.min(RED_PACKET_MAX_CENTS, fromAvailableCents),
    };
  }
  if (amountCents > fromAvailableCents) {
    return {
      ok: false,
      reason: `您的账户剩余红包 ¥${(fromAvailableCents / 100).toFixed(2)}, 无法转赠 ¥${(amountCents / 100).toFixed(2)}`,
      maxAllowed: fromAvailableCents,
    };
  }
  const remainingDailyQuota = TRANSFER_DAILY_AMOUNT_LIMIT - fromDailyTransferredCents;
  if (amountCents > remainingDailyQuota) {
    return {
      ok: false,
      reason: `今日还可转赠 ¥${(remainingDailyQuota / 100).toFixed(2)}, 已达日上限 ¥${TRANSFER_DAILY_AMOUNT_LIMIT / 100}`,
      maxAllowed: Math.max(0, remainingDailyQuota),
    };
  }
  return { ok: true, maxAllowed: amountCents };
}

/**
 * FIFO 扣减策略: 从 A 账户中最早未过期未使用的红包扣起
 *  返回扣减明细 (将作为 red_packet_transfers.from_packet_ids)
 */
export interface DeductionItem {
  packetId: string;
  deductCents: number;
}

export function fifoDeductPackets(
  packets: RedPacket[],
  totalCents: number
): { ok: boolean; items: DeductionItem[]; reason?: string } {
  if (totalCents <= 0) return { ok: false, items: [], reason: '金额必须大于 0' };
  const now = Date.now();
  const available = packets
    .filter(p => p.status === 'issued' && new Date(p.expires_at).getTime() > now)
    .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());
  const totalAvail = available.reduce((s, p) => s + (p.amount_cents - p.used_amount_cents), 0);
  if (totalAvail < totalCents) {
    return { ok: false, items: [], reason: '账户可用红包不足' };
  }
  const items: DeductionItem[] = [];
  let remaining = totalCents;
  for (const p of available) {
    if (remaining <= 0) break;
    const left = p.amount_cents - p.used_amount_cents;
    const take = Math.min(left, remaining);
    items.push({ packetId: p.id, deductCents: take });
    remaining -= take;
  }
  return { ok: true, items };
}

/**
 * 转账确认弹窗文案 (前端展示给 A 最后确认)
 */
export function buildTransferConfirmText(params: {
  toDisplay: string;
  amountCents: number;
  remainingAfterCents: number;
}): string {
  return `确认转赠 ${formatYuan(params.amountCents)} 给 ${params.toDisplay}?\n\n转赠后您的剩余可用红包: ${formatYuan(params.remainingAfterCents)}\n接收方将在 30 天内使用, 逾期作废。\n24 小时内可撤销 (限接收方未使用)。`;
}

/**
 * 校验是否可撤销
 */
export function canRevokeTransfer(params: {
  createdAt: string;
  toPacketStatus: 'issued' | 'used' | 'expired' | 'voided';
}): { ok: boolean; reason?: string } {
  const elapsedHours = (Date.now() - new Date(params.createdAt).getTime()) / 3_600_000;
  if (elapsedHours > TRANSFER_REVOKE_WINDOW_HOURS) {
    return { ok: false, reason: `已超过 ${TRANSFER_REVOKE_WINDOW_HOURS} 小时撤销窗口` };
  }
  if (params.toPacketStatus !== 'issued') {
    return { ok: false, reason: `接收方红包已 ${params.toPacketStatus === 'used' ? '使用' : '过期/作废'}, 不可撤销` };
  }
  return { ok: true };
}

/**
 * PIN 校验 (前端做格式校验, 真实哈希校验在后端)
 *  - 必须是 6 位数字
 */
export function isValidPinFormat(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}
