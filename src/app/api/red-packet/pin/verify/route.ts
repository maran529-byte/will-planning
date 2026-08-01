/**
 * POST /api/red-packet/pin/verify
 *
 * 校验 6 位 PIN (业务铁律 v1.1 · 1.7.5)
 *
 * Body: { pin: string }
 *
 * 用于:
 *   - 转赠前的前置验证 (UI 友好提示, 减少无效请求)
 *   - 修改 PIN 时的旧 PIN 验证
 *
 * 注意: 真正"业务校验"在 transfer / revoke RPC 中, 这里是辅助
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getOpenidFromCookie } from '@/lib/cookie';
import { getSupabaseUserIdFromOpenid } from '@/lib/user-mapping';
import { isValidPinFormat, PIN_LENGTH } from '@/lib/red_packet';
import { hashPin } from '@/lib/user_pin';

const verifySchema = z.object({
  pin: z.string().length(PIN_LENGTH),
});

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
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'INVALID_REQUEST', error: 'PIN 必须是 6 位数字' },
      { status: 400 }
    );
  }
  const { pin } = parsed.data;
  if (!isValidPinFormat(pin)) {
    return NextResponse.json(
      { code: 'INVALID_PIN', error: 'PIN 必须是 6 位数字' },
      { status: 400 }
    );
  }

  const pinHash = hashPin(pin);
  const { data, error } = await supabaseAdmin.rpc('verify_user_pin', {
    p_user_id: userId,
    p_pin_hash_attempt: pinHash,
  });

  if (error) {
    console.error('[pin/verify] RPC failed:', error);
    return NextResponse.json(
      { code: 'RPC_ERROR', error: '验证失败' },
      { status: 500 }
    );
  }

  const result = data as {
    ok: boolean;
    reason?: string;
    attempts_left?: number;
    locked_until?: string;
    remaining_seconds?: number;
  };
  if (!result.ok) {
    return NextResponse.json(
      {
        code: result.reason,
        error: result.reason === 'PIN_LOCKED' ? '账户已锁定, 请稍后再试' : 'PIN 错误',
        attempts_left: result.attempts_left,
        remaining_seconds: result.remaining_seconds,
      },
      { status: result.reason === 'PIN_LOCKED' ? 423 : 400 }
    );
  }

  return NextResponse.json({ success: true, message: 'PIN 验证通过' });
}
