/**
 * 创建 PC 端扫码登录票据
 * POST /api/wechat/pc-login-ticket
 *
 * 改版 v13 (2026-06-29) — 完整 5 场景登录闭环
 *
 * Body: { returnTo?: string }
 * Response: { ticket, code, qrUrl, expiresAt, pollInterval }
 *
 * 流程:
 *   1. PC 端打开登录弹窗
 *   2. 调本接口生成 ticket (UUID) + 8 位验证码
 *   3. 返回 {ticket, code, qrUrl}  → 前端展示公众号二维码 + 引导文案
 *   4. 用户扫码关注公众号
 *   5. 公众号内回复【PC】→ mp-callback 调 pc-login-confirm 绑定 openid + code
 *   6. 用户在 PC 端输入验证码 → 调 pc-login-verify 完成登录
 *
 * 安全:
 *   - 8 位大写字母数字 (36^8 ≈ 2.8 万亿组合) + 5 分钟过期 + 一次性
 *   - max_attempts=5 防爆破
 *   - 同时只允许每个 openid 绑定 1 个 pending ticket (避免一个用户开多个)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-server';

const RequestSchema = z.object({
  returnTo: z.string().max(512).optional(),
});

// 生成 URL safe 字符串
function generateTicket(): string {
  return randomBytes(12).toString('base64url'); // 16 字符
}

// 生成 8 位大写字母数字验证码 (去掉容易混淆的 0/O/1/I/L)
function generateCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 32 chars
  const bytes = randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { code: 'SUPABASE_NOT_CONFIGURED', error: 'Supabase 未配齐' },
      { status: 503 }
    );
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // 允许空 body
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'INVALID_REQUEST', error: '请求参数不合法' },
      { status: 400 }
    );
  }

  const { returnTo } = parsed.data;
  const ticket = generateTicket();

  const userAgent = request.headers.get('user-agent') || null;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  // 改版 v15 (2026-08-02): code 碰撞重试
  //   UNIQUE INDEX uniq_pc_login_active_code 保证同一 code 不会被同时分配给 2 个 active ticket
  //   INSERT 冲突时重生成 code 即可, 最多 5 次
  let data: { ticket: string; code: string; expires_at: string } | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const result = await supabaseAdmin
      .from('pc_login_tickets')
      .insert({
        ticket,
        code,
        status: 'pending',
        return_to: returnTo || '/orders',
        user_agent: userAgent,
        ip_address: ip,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      })
      .select('ticket, code, expires_at')
      .single();

    if (!result.error && result.data) {
      data = result.data;
      break;
    }
    const errCode = (result.error as { code?: string })?.code;
    // UNIQUE INDEX 冲突 (code 碰撞) → 重试
    if (errCode === '23505') {
      console.warn(`[pc-login-ticket] code collision (attempt ${attempt + 1}/5), retrying`);
      lastError = result.error;
      continue;
    }
    lastError = result.error;
    break;
  }

  if (!data) {
    const errMsg = (lastError as { message?: string })?.message ?? 'unknown';
    const errCode = (lastError as { code?: string })?.code ?? 'none';
    const errHint = (lastError as { hint?: string })?.hint ?? '';
    console.error('[pc-login-ticket] insert failed after retries:', JSON.stringify({
      message: errMsg, code: errCode, hint: errHint, lastError
    }, null, 2));
    return NextResponse.json(
      {
        code: 'TICKET_CREATE_FAILED',
        error: '创建票据失败',
        supabase_code: errCode,
        supabase_msg: errMsg,
      },
      { status: 500 }
    );
  }

  // 公众号二维码 URL (用 h5.aiwill-planner.cn 子域,与登录流程一致)
  const qrUrl = 'https://h5.aiwill-planner.cn/';

  return NextResponse.json({
    ticket: data.ticket,
    code: data.code,
    qrUrl,
    expiresAt: data.expires_at,
    pollInterval: 2000, // 2 秒轮询
  });
}
