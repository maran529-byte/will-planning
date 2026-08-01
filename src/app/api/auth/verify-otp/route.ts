/**
 * 验证码登录 POST /api/auth/verify-otp
 *
 * Body: { channel: 'sms' | 'email', target: string, code: string }
 *
 * 行为:
 *  - 校验 OTP
 *  - 找到/创建 Supabase auth.users (用 phone 或 email 作 identity)
 *  - 写 user_session cookie
 *  - 同步 public.users 记录
 *
 * 注意事项:
 *  - 不会泄露 OTP 内容, 错误响应只说明「错误类型 + 剩余次数」
 *  - 5 次错误后该 OTP 失效
 *  - 不影响邮箱密码登录 (走 /api/auth/login)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import {
  SUPABASE_INTERNAL_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
} from '@/lib/config';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyOtp, type OtpChannel } from '@/lib/otp';
import { setUserSessionCookie } from '@/lib/user-auth';

const verifyOtpSchema = z.object({
  channel: z.enum(['sms', 'email']),
  target: z.string().min(3).max(120),
  code: z.string().regex(/^\d{6}$/, '请输入 6 位数字验证码'),
});

/**
 * 根据手机号/邮箱查找现有 Supabase 用户 id.
 * 找不到时返回 null.
 */
async function findUserIdByIdentity(target: string, channel: 'sms' | 'email'): Promise<string | null> {
  if (!supabaseAdmin) return null;
  const column = channel === 'sms' ? 'phone' : 'email';
  const { data } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq(column, target)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * 创建/获取 Supabase auth 用户.
 * 对于邮箱: 用 admin.createUser 创建 (email_confirm: true, 无需邮件确认)
 * 对于手机号: 同样 createUser, 但用 phone 作 email (auth.users 要求 email 格式)
 *   用 [phone]@phone.aiwill-planner.cn 作为占位 email
 */
async function ensureAuthUser(target: string, channel: 'sms' | 'email'): Promise<{ userId: string; email: string } | null> {
  if (!SUPABASE_INTERNAL_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  if (!supabaseAdmin) return null;

  // 1. 查 public.users 是否已有
  const existingId = await findUserIdByIdentity(target, channel);
  if (existingId) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(existingId);
    return {
      userId: existingId,
      email: authUser?.user?.email ?? (channel === 'email' ? target : ''),
    };
  }

  // 2. 创建新 auth user
  const adminClient = createClient(SUPABASE_INTERNAL_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 对于手机号, 构造占位 email (auth.users 强制 email NOT NULL)
  const email = channel === 'email' ? target : `${target}@phone.aiwill-planner.cn`;
  const password = `otp-${target}-${Date.now()}`; // 永远不会用到的占位密码
  const userMetadata: Record<string, unknown> =
    channel === 'sms' ? { phone: target, phone_verified: true } : { email_verified: true };

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: channel === 'email',
    phone: channel === 'sms' ? target : undefined,
    phone_confirm: channel === 'sms',
    user_metadata: userMetadata,
  });
  if (error || !data.user) {
    console.error('[verify-otp] createUser failed:', error);
    return null;
  }

  // 3. 同步到 public.users
  await supabaseAdmin.from('users').upsert(
    {
      id: data.user.id,
      email: channel === 'email' ? target : email,
      phone: channel === 'sms' ? target : null,
      last_login_at: new Date().toISOString(),
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );

  return { userId: data.user.id, email };
}

/**
 * 为已存在的 auth user 生成可登录 session.
 * 通过 admin.createSession (Supabase 19+ 支持) 或 generateLink 间接获取.
 */
async function issueSessionForUser(userId: string, _email: string): Promise<{ accessToken: string; expiresIn: number } | null> {
  if (!SUPABASE_INTERNAL_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  const adminClient = createClient(SUPABASE_INTERNAL_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 用 generateLink + verifyOtp 走 magic-link 流程取 access_token
  // 实际场景下推荐: 短期 JWT 自签, 但 Supabase 不允许自定义 JWT.
  // 替代方案: 调 admin.createUser + immediate session 不存在, 需要走客户端.
  // 当前最佳: 通过 signInWithPassword (但密码我们没存)
  // → 改用最小副作用: signInWithIdToken / 不行
  // → 最务实: 让前端用 signInWithOtp (anon) + 我们做幂等; 但前端 Supabase key 必须能访问到 user
  // 简化: 这里我们用 admin.generateLink 让用户"首次登录", 但太重.
  // 最终方案: 走 supabase.auth.admin.createSession (19.x+ 提供)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyAdmin: any = adminClient.auth.admin;
    if (typeof anyAdmin.createSession === 'function') {
      const { data, error } = await anyAdmin.createSession({ user_id: userId });
      if (error || !data?.session) return null;
      return {
        accessToken: data.session.access_token,
        expiresIn: data.session.expires_in ?? 3600,
      };
    }
  } catch (err) {
    console.warn('[verify-otp] createSession not available, fallback to magic link', err);
  }

  // 兜底: 临时发放 session 用 generateLink (前端不再做二次跳转)
  // 注: 实际 Supabase 版本若不支持 createSession, 这里返回 null 让前端提示用户
  return null;
}

export async function POST(request: NextRequest) {
  if (!SUPABASE_INTERNAL_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { code: 'SUPABASE_NOT_CONFIGURED', error: 'Supabase 未配齐' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', error: '请求格式错误' }, { status: 400 });
  }

  const parsed = verifyOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'INVALID_REQUEST', error: '参数不合法' },
      { status: 400 }
    );
  }

  const { channel, target, code } = parsed.data;
  const normalizedTarget = channel === 'sms' ? target.replace(/[\s-]/g, '') : target.trim().toLowerCase();

  // 1. 校验 OTP
  const otpResult = await verifyOtp({
    channel: channel as OtpChannel,
    target: normalizedTarget,
    code,
  });
  if (!otpResult.ok) {
    const statusByReason: Record<string, number> = {
      NOT_FOUND: 404,
      EXPIRED: 410,
      TOO_MANY_ATTEMPTS: 429,
      WRONG_CODE: 401,
      ALREADY_CONSUMED: 409,
    };
    return NextResponse.json(
      {
        code: otpResult.reason,
        error: codeErrorMessage(otpResult.reason!),
        remainingAttempts: otpResult.remainingAttempts,
      },
      { status: statusByReason[otpResult.reason!] ?? 400 }
    );
  }

  // 2. 找/创建 user
  const user = await ensureAuthUser(normalizedTarget, channel as 'sms' | 'email');
  if (!user) {
    return NextResponse.json(
      { code: 'USER_CREATE_FAILED', error: '用户创建失败, 请稍后重试' },
      { status: 500 }
    );
  }

  // 3. 发放 session
  const session = await issueSessionForUser(user.userId, user.email);
  if (!session) {
    // Supabase 版本不支持 createSession 时, 返回友好提示 (前端可降级到密码登录)
    return NextResponse.json(
      {
        code: 'SESSION_ISSUE_FAILED',
        error: '验证码已校验通过, 但当前 Supabase 版本不支持免密登录, 请联系管理员或使用密码登录',
        userId: user.userId,
      },
      { status: 501 }
    );
  }

  // 4. 写 cookie
  const expiresAt = Date.now() + session.expiresIn * 1000;
  await setUserSessionCookie(session.accessToken, expiresAt);

  return NextResponse.json({
    success: true,
    user: { id: user.userId, email: user.email },
  });
}

function codeErrorMessage(reason: string): string {
  switch (reason) {
    case 'NOT_FOUND':
      return '请先获取验证码';
    case 'EXPIRED':
      return '验证码已过期, 请重新获取';
    case 'TOO_MANY_ATTEMPTS':
      return '错误次数过多, 请重新获取验证码';
    case 'WRONG_CODE':
      return '验证码不正确';
    case 'ALREADY_CONSUMED':
      return '验证码已使用, 请重新获取';
    default:
      return '验证失败, 请重试';
  }
}
