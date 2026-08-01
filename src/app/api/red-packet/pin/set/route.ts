/**
 * POST /api/red-packet/pin/set
 *
 * 首次设置用户 6 位 PIN (业务铁律 v1.1 · 1.7.5)
 *
 * Body: { pin: string, pin_confirm: string }
 *
 * 注意:
 *   - 已有 PIN 不能用本接口修改 (需另开 update_user_pin)
 *   - 前端应当先弹邮箱/手机二次验证 (这里仅做格式 + 调用 RPC)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getOpenidFromCookie } from '@/lib/cookie';
import { getSupabaseUserIdFromOpenid } from '@/lib/user-mapping';
import { isValidPinFormat, PIN_LENGTH } from '@/lib/red_packet';
import { hashPin } from '@/lib/user_pin';

const setPinSchema = z.object({
  pin: z.string().length(PIN_LENGTH),
  pin_confirm: z.string().length(PIN_LENGTH),
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
  const parsed = setPinSchema.safeParse(body);
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
  const { pin, pin_confirm } = parsed.data;
  if (pin !== pin_confirm) {
    return NextResponse.json(
      { code: 'PIN_MISMATCH', error: '两次输入的 PIN 不一致' },
      { status: 400 }
    );
  }
  if (!isValidPinFormat(pin)) {
    return NextResponse.json(
      { code: 'INVALID_PIN', error: 'PIN 必须是 6 位数字' },
      { status: 400 }
    );
  }
  // 防弱 PIN: 123456 / 654321 / 重复数字
  if (/^(\d)\1{5}$/.test(pin) || pin === '123456' || pin === '654321') {
    return NextResponse.json(
      { code: 'WEAK_PIN', error: 'PIN 太简单, 请换一个 (不要 123456/重复数字)' },
      { status: 400 }
    );
  }

  const pinHash = hashPin(pin);
  const { data, error } = await supabaseAdmin.rpc('set_user_pin', {
    p_user_id: userId,
    p_pin_hash: pinHash,
  });

  if (error) {
    console.error('[pin/set] RPC failed:', error);
    return NextResponse.json(
      { code: 'RPC_ERROR', error: '设置 PIN 失败' },
      { status: 500 }
    );
  }

  const result = data as { ok: boolean; reason?: string };
  if (!result.ok) {
    return NextResponse.json(
      {
        code: result.reason || 'SET_PIN_FAILED',
        error: result.reason === 'PIN_ALREADY_SET' ? '您已设置过 PIN, 请使用修改 PIN 功能' : '设置失败',
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'PIN 设置成功, 后续红包转赠将使用此 PIN 二次确认',
  });
}
