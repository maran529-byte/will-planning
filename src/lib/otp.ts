/**
 * OTP (One-Time Password) 服务 (改版 v9, 2026-06-28).
 *
 * 流程:
 *   1. requestOtp({ channel, target })  →  生成 6 位数字, hash 存表, 返回 ok
 *   2. verifyOtp({ channel, target, code })  →  校验, 通过则 mark consumed
 *
 * 安全:
 *   - 验证码 hash 后存 (SHA-256 + 服务端 salt), DB 泄露不直接暴露明文
 *   - 5 分钟自动过期
 *   - 5 次错误尝试锁死
 *   - 同一 target 60 秒内只能发一次 (防刷)
 *   - 同一 IP 1 小时最多 10 次 (防滥用)
 */

import { createHash, randomInt } from 'crypto';
import { supabaseAdmin } from './supabase-server';
import { sendSmsCode } from './sms';

const SERVER_SALT = process.env.OTP_SERVER_SALT || 'aiwill-planner-otp-2026';
const CODE_TTL_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;
const IP_HOURLY_LIMIT = 10;

export type OtpChannel = 'sms' | 'email';
export type OtpPurpose = 'login' | 'register' | 'reset';

export interface RequestOtpResult {
  ok: boolean;
  reason?:
    | 'INVALID_TARGET'
    | 'RATE_LIMIT_IP'
    | 'RATE_LIMIT_RESEND'
    | 'SEND_FAILED'
    | 'SERVER_ERROR';
  /** 重发冷却剩余秒数 */
  retryAfter?: number;
}

export interface VerifyOtpResult {
  ok: boolean;
  reason?:
    | 'NOT_FOUND'
    | 'EXPIRED'
    | 'TOO_MANY_ATTEMPTS'
    | 'WRONG_CODE'
    | 'ALREADY_CONSUMED'
    | 'SERVER_ERROR';
  /** 剩余尝试次数 (前端降级展示) */
  remainingAttempts?: number;
}

function hashCode(code: string): string {
  return createHash('sha256').update(code + SERVER_SALT).digest('hex');
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s-]/g, '');
}

function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateCode(): string {
  // 6 位数字, 范围 000000-999999
  return String(randomInt(0, 1000000)).padStart(6, '0');
}

/**
 * 申请 OTP 验证码.
 */
export async function requestOtp(params: {
  channel: OtpChannel;
  target: string;
  purpose?: OtpPurpose;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<RequestOtpResult> {
  const { channel, purpose = 'login', ipAddress = null, userAgent = null } = params;
  const target = channel === 'sms' ? normalizePhone(params.target) : params.target.trim().toLowerCase();

  // 1. 目标格式校验 (放在 supabaseAdmin 检查之前, 避免无谓依赖)
  if (channel === 'sms' && !isValidPhone(target)) {
    return { ok: false, reason: 'INVALID_TARGET' };
  }
  if (channel === 'email' && !isValidEmail(target)) {
    return { ok: false, reason: 'INVALID_TARGET' };
  }

  if (!supabaseAdmin) {
    return { ok: false, reason: 'SERVER_ERROR' };
  }

  // 2. IP 1 小时频率限制
  if (ipAddress) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: ipCount } = await supabaseAdmin
      .from('otp_codes')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ipAddress)
      .gte('created_at', oneHourAgo);
    if ((ipCount ?? 0) >= IP_HOURLY_LIMIT) {
      return { ok: false, reason: 'RATE_LIMIT_IP' };
    }
  }

  // 3. 同一 target 60 秒内只能发一次
  const cooldownAgo = new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000).toISOString();
  const { data: lastOtp } = await supabaseAdmin
    .from('otp_codes')
    .select('created_at')
    .eq('target', target)
    .eq('channel', channel)
    .eq('purpose', purpose)
    .gte('created_at', cooldownAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastOtp) {
    const elapsed = Date.now() - new Date(lastOtp.created_at).getTime();
    const retryAfter = Math.max(1, RESEND_COOLDOWN_SECONDS - Math.floor(elapsed / 1000));
    return { ok: false, reason: 'RATE_LIMIT_RESEND', retryAfter };
  }

  // 4. 生成 + 发送
  const code = generateCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

  const { error: insertErr } = await supabaseAdmin.from('otp_codes').insert({
    channel,
    target,
    code_hash: codeHash,
    purpose,
    consumed: false,
    attempts: 0,
    max_attempts: MAX_ATTEMPTS,
    ip_address: ipAddress,
    user_agent: userAgent,
    expires_at: expiresAt,
  });
  if (insertErr) {
    console.error('[otp] insert failed:', insertErr);
    return { ok: false, reason: 'SERVER_ERROR' };
  }

  if (channel === 'sms') {
    const smsRes = await sendSmsCode(target, code);
    if (!smsRes.ok) {
      // 发送失败 → 删除刚 insert 的记录 (让用户能重试)
      // 注意: 这里 ignore error, 用户感知是「重发」, 不会影响一致性
      await supabaseAdmin
        .from('otp_codes')
        .delete()
        .eq('target', target)
        .eq('code_hash', codeHash)
        .is('consumed', false);
      return { ok: false, reason: 'SEND_FAILED' };
    }
  } else {
    // 邮件通道: 通过 Supabase Auth resetPasswordForEmail 模式
    // 现阶段: 仅在 dev 模式 console 输出 (与 SMS 一致)
    // TODO v9.1: 接入 SendGrid / Resend
    console.log(`[EMAIL-DEV] target=${target} code=${code}`);
  }

  return { ok: true };
}

/**
 * 校验 OTP 验证码.
 * - 通过 → mark consumed, 返回 ok=true
 * - 失败 → attempts++, 超过 max_attempts 后该条记录失效
 */
export async function verifyOtp(params: {
  channel: OtpChannel;
  target: string;
  code: string;
  purpose?: OtpPurpose;
}): Promise<VerifyOtpResult> {
  if (!supabaseAdmin) {
    return { ok: false, reason: 'SERVER_ERROR' };
  }

  const { channel, purpose = 'login' } = params;
  const target = channel === 'sms' ? normalizePhone(params.target) : params.target.trim().toLowerCase();
  const code = params.code.trim();

  if (!/^\d{6}$/.test(code)) {
    return { ok: false, reason: 'WRONG_CODE' };
  }

  // 找最新一条未消费 + 未过期 + 同 target/channel/purpose
  const { data: row, error: fetchErr } = await supabaseAdmin
    .from('otp_codes')
    .select('id, code_hash, attempts, max_attempts, expires_at, consumed')
    .eq('target', target)
    .eq('channel', channel)
    .eq('purpose', purpose)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchErr) {
    console.error('[otp] fetch failed:', fetchErr);
    return { ok: false, reason: 'SERVER_ERROR' };
  }
  if (!row) {
    return { ok: false, reason: 'NOT_FOUND' };
  }
  if (row.consumed) {
    return { ok: false, reason: 'ALREADY_CONSUMED' };
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'EXPIRED' };
  }
  if (row.attempts >= row.max_attempts) {
    return { ok: false, reason: 'TOO_MANY_ATTEMPTS' };
  }

  // 校验 hash
  const inputHash = hashCode(code);
  if (inputHash !== row.code_hash) {
    // 失败: attempts++
    const newAttempts = row.attempts + 1;
    await supabaseAdmin
      .from('otp_codes')
      .update({ attempts: newAttempts })
      .eq('id', row.id);
    return {
      ok: false,
      reason: 'WRONG_CODE',
      remainingAttempts: Math.max(0, row.max_attempts - newAttempts),
    };
  }

  // 通过: mark consumed
  await supabaseAdmin
    .from('otp_codes')
    .update({ consumed: true })
    .eq('id', row.id);

  return { ok: true, remainingAttempts: row.max_attempts - row.attempts - 1 };
}
