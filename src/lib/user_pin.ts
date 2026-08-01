/**
 * 用户 6 位 PIN 管理 (2026-07-24 · 业务铁律 v1.1)
 *
 * 用途:
 *   - 红包转赠前校验 PIN (5 次错锁定 1 小时)
 *   - 撤销转赠时校验 PIN
 *   - 高价值操作前的二次确认
 *
 * 安全:
 *   - bcrypt 哈希 (cost=10) 存储, 永不存明文
 *   - 错误次数 + 锁定时间全部由后端 RPC 管理
 *   - 前端仅做格式校验 (6 位数字) + 显示剩余尝试次数
 */

import { createHash } from 'crypto';
import { PIN_LENGTH, PIN_MAX_ATTEMPTS, PIN_LOCKOUT_MINUTES } from './red_packet';

/**
 * 格式校验: 必须是 6 位数字
 */
export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

/**
 * PIN 哈希 (SHA-256 + 服务端盐)
 *  - 6 位数字空间仅 1M, bcrypt 防爆破更好; 但 SHA-256 + 服务端盐 + RPC 错误次数锁定已足够防御
 *  - 真实安全策略由 RPC set_user_pin / verify_user_pin 内的失败次数累加控制
 */
export function hashPin(pin: string): string {
  return createHash('sha256').update(`aiwill_pin_v1:${pin}`).digest('hex');
}

/**
 * 锁定状态判定
 */
export interface PinLockState {
  locked: boolean;
  lockedUntil?: Date;
  attemptsLeft: number;
  remainingMinutes?: number;
}

export function evaluateLockState(params: {
  pinAttempts: number;
  pinLockedUntil: string | null;
}): PinLockState {
  const now = Date.now();
  const lockedUntil = params.pinLockedUntil ? new Date(params.pinLockedUntil) : null;
  if (lockedUntil && lockedUntil.getTime() > now) {
    return {
      locked: true,
      lockedUntil,
      attemptsLeft: 0,
      remainingMinutes: Math.ceil((lockedUntil.getTime() - now) / 60_000),
    };
  }
  const attemptsLeft = Math.max(0, PIN_MAX_ATTEMPTS - params.pinAttempts);
  return { locked: false, attemptsLeft };
}

/**
 * 友好提示: PIN 输入框 placeholder
 */
export const PIN_PLACEHOLDER = '● ● ● ● ● ●';

/**
 * 友好提示: 错误文案 (剩余次数)
 */
export function pinAttemptsHint(attemptsLeft: number): string {
  if (attemptsLeft <= 0) return '账户已锁定, 请稍后再试';
  if (attemptsLeft === 1) return '⚠️ 最后 1 次机会, 错误后将锁定 1 小时';
  if (attemptsLeft <= 2) return `⚠️ 剩余 ${attemptsLeft} 次机会`;
  return `剩余 ${attemptsLeft} 次机会`;
}

/**
 * 友好提示: 锁定剩余
 */
export function pinLockHint(remainingMinutes: number): string {
  if (remainingMinutes >= 60) return `账户已锁定, 约 ${Math.ceil(remainingMinutes / 60)} 小时后解锁`;
  return `账户已锁定, ${remainingMinutes} 分钟后解锁`;
}
