/**
 * POST /api/red-packet/transfer/revoke
 *
 * A 撤销 24h 内的转赠 (业务铁律 v1.1 · 1.7.5)
 *
 * Body: { transfer_id: string, pin: string }
 *
 * 限制:
 *   - 仅 from_user_id 本人
 *   - 仅 24h 内
 *   - 仅 to 红包未被使用
 *   - 需 PIN 二次确认
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getOpenidFromCookie } from '@/lib/cookie';
import { getSupabaseUserIdFromOpenid } from '@/lib/user-mapping';
import { isValidPinFormat } from '@/lib/red_packet';

const revokeSchema = z.object({
  transfer_id: z.string().uuid('转赠 ID 格式错误'),
  pin: z.string().min(6).max(6),
});

function hashPin(pin: string): string {
  return createHash('sha256').update(`aiwill_pin_v1:${pin}`).digest('hex');
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { code: 'SERVER_ERROR', error: '数据库未配置' },
      { status: 500 }
    );
  }

  const openid = await getOpenidFromCookie();
  if (!openid) {
    return NextResponse.json(
      { code: 'UNAUTHENTICATED', error: '请先登录' },
      { status: 401 }
    );
  }
  const userId = await getSupabaseUserIdFromOpenid(openid).catch(() => null);
  if (!userId) {
    return NextResponse.json(
      { code: 'USER_NOT_FOUND', error: '用户不存在' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: 'INVALID_JSON', error: '请求格式错误' },
      { status: 400 }
    );
  }
  const parsed = revokeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: 'INVALID_REQUEST',
        error: '参数校验失败',
        issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
      },
      { status: 400 }
    );
  }
  const { transfer_id, pin } = parsed.data;

  if (!isValidPinFormat(pin)) {
    return NextResponse.json(
      { code: 'INVALID_PIN', error: 'PIN 必须是 6 位数字' },
      { status: 400 }
    );
  }

  const pinHash = hashPin(pin);
  const { data, error } = await supabaseAdmin.rpc('revoke_red_packet_transfer', {
    p_transfer_id: transfer_id,
    p_user_id: userId,
    p_pin_hash_attempt: pinHash,
  });

  if (error) {
    console.error('[transfer/revoke] RPC failed:', error);
    return NextResponse.json(
      { code: 'RPC_ERROR', error: '撤销失败, 请稍后重试' },
      { status: 500 }
    );
  }

  const result = data as { ok: boolean; reason?: string; [k: string]: unknown };
  if (!result.ok) {
    const code = (result.reason as string) || 'REVOKE_FAILED';
    return NextResponse.json(
      {
        code,
        error: revokeErrorMessage(code),
        details: result,
      },
      { status: code === 'PIN_LOCKED' ? 423 : 400 }
    );
  }

  return NextResponse.json({
    success: true,
    returned_packet_id: result.returned_packet_id,
    amount_cents: result.amount_cents,
    message: `已成功撤销转赠, ¥${((result.amount_cents as number) / 100).toFixed(2)} 已退回您的账户`,
  });
}

function revokeErrorMessage(code: string): string {
  const map: Record<string, string> = {
    TRANSFER_NOT_FOUND: '转赠记录不存在',
    NOT_OWNER: '只能撤销自己发起的转赠',
    ALREADY_REVOKED: '该转赠已撤销',
    REVOKE_WINDOW_EXPIRED: '已超过 24 小时撤销窗口',
    RECIPIENT_PACKET_NOT_REVOCABLE: '接收方红包已被使用, 不可撤销',
    RECIPIENT_ALREADY_USED_PARTIAL: '接收方红包已部分使用, 不可撤销',
    PIN_NOT_SET: '请先设置 PIN',
    PIN_WRONG: 'PIN 错误',
    PIN_LOCKED: 'PIN 错误次数过多, 账户已锁定 1 小时',
  };
  return map[code] || '撤销失败';
}
