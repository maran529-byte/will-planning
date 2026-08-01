/**
 * 发送验证码 POST /api/auth/send-otp
 *
 * Body: { channel: 'sms' | 'email', target: string, purpose?: 'login' | 'register' | 'reset' }
 *
 * 行为:
 *  - 校验 target 格式
 *  - 60 秒内同 target 同 channel 不重复发
 *  - IP 1 小时 ≤ 10 次
 *  - 成功 → 201 + { ok: true, retryAfter?: number }
 *  - 失败 → 4xx + 错误码
 *
 * 注意: 此端点**永远不返回验证码** (防泄露). 验证码通过短信/邮件送达.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requestOtp, type OtpChannel } from '@/lib/otp';

const sendOtpSchema = z.object({
  channel: z.enum(['sms', 'email']),
  target: z.string().min(3).max(120),
  purpose: z.enum(['login', 'register', 'reset']).optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', error: '请求格式错误' }, { status: 400 });
  }

  const parsed = sendOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: 'INVALID_REQUEST',
        error: '参数不合法',
        issues: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const { channel, target, purpose } = parsed.data;

  // IP / UA 采集 (供速率限制 + 审计)
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null;
  const userAgent = request.headers.get('user-agent') || null;

  const result = await requestOtp({
    channel: channel as OtpChannel,
    target,
    purpose,
    ipAddress,
    userAgent,
  });

  if (!result.ok) {
    switch (result.reason) {
      case 'INVALID_TARGET':
        return NextResponse.json(
          { code: 'INVALID_TARGET', error: channel === 'sms' ? '请输入有效手机号' : '请输入有效邮箱' },
          { status: 400 }
        );
      case 'RATE_LIMIT_IP':
        return NextResponse.json(
          { code: 'RATE_LIMIT_IP', error: '请求过于频繁, 请稍后再试' },
          { status: 429 }
        );
      case 'RATE_LIMIT_RESEND':
        return NextResponse.json(
          {
            code: 'RATE_LIMIT_RESEND',
            error: `${result.retryAfter ?? 60} 秒后可重新获取验证码`,
            retryAfter: result.retryAfter ?? 60,
          },
          { status: 429 }
        );
      case 'SEND_FAILED':
        return NextResponse.json(
          { code: 'SEND_FAILED', error: '验证码发送失败, 请稍后重试' },
          { status: 502 }
        );
      default:
        return NextResponse.json(
          { code: 'SERVER_ERROR', error: '服务器繁忙, 请稍后重试' },
          { status: 500 }
        );
    }
  }

  return NextResponse.json({
    success: true,
    message: '验证码已发送',
    /** 验证码有效期 (秒) — 前端倒计时 */
    expiresIn: 300,
  });
}
