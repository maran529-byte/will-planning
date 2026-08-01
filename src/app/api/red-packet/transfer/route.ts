/**
 * GET  /api/red-packet/transfer?records=1   查询当前用户的转赠记录
 * POST /api/red-packet/transfer             A → B 转赠红包 (v1.1)
 *
 * 用于 H5 /wallet-policy 页面 TransferPanel
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getOpenidFromCookie } from '@/lib/cookie';
import { getSupabaseUserIdFromOpenid } from '@/lib/user-mapping';
import {
  RED_PACKET_MIN_CENTS,
  RED_PACKET_MAX_CENTS,
  TRANSFER_DAILY_AMOUNT_LIMIT,
  TRANSFER_DAILY_COUNT_LIMIT,
  TRANSFER_REVOKE_WINDOW_HOURS,
  isValidPinFormat,
} from '@/lib/red_packet';
import { hashPin } from '@/lib/user_pin';

export async function GET(request: NextRequest) {
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

  const searchParams = request.nextUrl.searchParams;
  if (searchParams.get('records') !== '1') {
    return NextResponse.json(
      { code: 'INVALID_REQUEST', error: '缺少 records=1 参数' },
      { status: 400 }
    );
  }

  // 查询转出 + 转入 (并联 union)
  const { data: transfers, error } = await supabaseAdmin
    .from('red_packet_transfers')
    .select('id, from_user_id, to_user_id, amount_cents, created_at, revoked_at, to_packet_id')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[transfer GET] query failed:', error);
    return NextResponse.json(
      { code: 'DB_ERROR', error: '查询失败' },
      { status: 500 }
    );
  }

  // 取所有相关红包的状态
  const packetIds = (transfers ?? []).map(t => t.to_packet_id).filter(Boolean);
  let packetStatusMap = new Map<string, string>();
  if (packetIds.length > 0) {
    const { data: packets } = await supabaseAdmin
      .from('red_packets')
      .select('id, status, used_amount_cents')
      .in('id', packetIds);
    for (const p of packets ?? []) {
      packetStatusMap.set(p.id, p.status);
    }
  }

  // 取所有相关用户的 display_name / email
  const userIds = new Set<string>();
  (transfers ?? []).forEach(t => {
    userIds.add(t.from_user_id);
    userIds.add(t.to_user_id);
  });
  let userMap = new Map<string, string>();
  if (userIds.size > 0) {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .in('id', Array.from(userIds));
    for (const u of users ?? []) {
      userMap.set(u.id, u.display_name || u.email || u.id);
    }
  }

  const now = Date.now();
  const records = (transfers ?? []).map(t => {
    const direction = t.from_user_id === userId ? 'out' : 'in';
    const counterparty = direction === 'out' ? t.to_user_id : t.from_user_id;
    const toStatus = packetStatusMap.get(t.to_packet_id) as 'issued' | 'used' | 'expired' | 'voided' | undefined;
    const elapsedHours = (now - new Date(t.created_at).getTime()) / 3_600_000;
    const canRevoke =
      direction === 'out' &&
      !t.revoked_at &&
      elapsedHours <= TRANSFER_REVOKE_WINDOW_HOURS &&
      toStatus === 'issued';
    return {
      id: t.id,
      direction,
      counterparty: userMap.get(counterparty) || counterparty,
      amount_cents: t.amount_cents,
      created_at: t.created_at,
      revoked_at: t.revoked_at,
      to_packet_status: toStatus ?? 'issued',
      can_revoke: canRevoke,
    };
  });

  return NextResponse.json({ success: true, records });
}

const transferSchema = z.object({
  recipient_id: z.string().uuid(),
  amount_cents: z.number().int().min(RED_PACKET_MIN_CENTS).max(RED_PACKET_MAX_CENTS),
  pin: z.string().length(6),
});

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ code: 'SERVER_ERROR', error: '数据库未配置' }, { status: 500 });
  }
  const openid = await getOpenidFromCookie();
  if (!openid) {
    return NextResponse.json({ code: 'UNAUTHENTICATED', error: '请先登录' }, { status: 401 });
  }
  const userId = await getSupabaseUserIdFromOpenid(openid).catch(() => null);
  if (!userId) {
    return NextResponse.json({ code: 'USER_NOT_FOUND', error: '用户不存在' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', error: '请求体不是合法 JSON' }, { status: 400 });
  }
  const parsed = transferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'INVALID_REQUEST', error: '参数校验失败', details: parsed.error.issues },
      { status: 400 }
    );
  }
  if (!isValidPinFormat(parsed.data.pin)) {
    return NextResponse.json({ code: 'INVALID_PIN_FORMAT', error: 'PIN 必须为 6 位数字' }, { status: 400 });
  }
  if (parsed.data.recipient_id === userId) {
    return NextResponse.json({ code: 'CANNOT_TRANSFER_TO_SELF', error: '不能转赠给自己' }, { status: 400 });
  }

  // 日上限前置校验 (前端已校验, 这里再次校验防绕过)
  // (RPC 内会再次校验, 这层只做快速反馈)

  const pinHash = hashPin(parsed.data.pin);

  const { data, error } = await supabaseAdmin.rpc('transfer_red_packet', {
    p_from_user_id: userId,
    p_to_user_id: parsed.data.recipient_id,
    p_amount_cents: parsed.data.amount_cents,
    p_pin_hash: pinHash,
    p_daily_amount_limit: TRANSFER_DAILY_AMOUNT_LIMIT,
    p_daily_count_limit: TRANSFER_DAILY_COUNT_LIMIT,
    p_ip_addr: request.headers.get('x-forwarded-for') || null,
    p_user_agent: request.headers.get('user-agent') || null,
  });

  if (error) {
    console.error('[transfer POST] rpc failed:', error);
    return NextResponse.json(
      { code: 'RPC_ERROR', error: error.message || '转赠失败, 请稍后重试' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, transfer: data });
}
