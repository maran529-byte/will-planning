/**
 * 轮询 PC 端 ticket 状态
 * GET /api/wechat/pc-login-status?ticket=xxx
 *
 * 改版 v13 (2026-06-29)
 *
 * Response:
 *   { status: 'pending', expiresAt }                    — 等待用户扫码
 *   { status: 'confirmed', openidHint, returnTo }       — 公众号已确认,等待用户输入验证码
 *   { status: 'expired' }                               — 已过期
 *   { status: 'cancelled' }                             — 已被新票据取代
 *   { status: 'consumed' }                              — 已登录(后续不再轮询)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { code: 'SUPABASE_NOT_CONFIGURED', error: 'Supabase 未配齐' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const ticket = searchParams.get('ticket');

  if (!ticket || ticket.length < 8) {
    return NextResponse.json(
      { code: 'INVALID_REQUEST', error: '缺少 ticket 参数' },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('pc_login_tickets')
    .select('status, expires_at, openid, return_to, confirmed_at')
    .eq('ticket', ticket)
    .maybeSingle();

  if (error) {
    console.error('[pc-login-status] query failed:', error);
    return NextResponse.json(
      { code: 'QUERY_FAILED', error: '查询失败' },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { code: 'TICKET_NOT_FOUND', error: '票据不存在' },
      { status: 404 }
    );
  }

  // 自动标记过期
  if (
    data.status === 'pending' &&
    new Date(data.expires_at) < new Date()
  ) {
    await supabaseAdmin
      .from('pc_login_tickets')
      .update({ status: 'expired' })
      .eq('ticket', ticket);
    return NextResponse.json({ status: 'expired' });
  }

  // 状态机: pending → confirmed → consumed
  //         pending → expired / cancelled
  const response: Record<string, unknown> = {
    status: data.status,
    expiresAt: data.expires_at,
  };

  if (data.status === 'confirmed') {
    // 给前端一个 hint(不暴露完整 openid, 只暴露昵称 hash 用于友好展示)
    response.openidHint = data.openid ? data.openid.slice(-4) : null;
    response.returnTo = data.return_to;
  }

  return NextResponse.json(response);
}
