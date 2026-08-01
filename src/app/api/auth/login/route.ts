/**
 * 用户登录 / 登出 / 查询当前用户
 *
 * POST   /api/auth/login     登录 (body: { email, password })
 * DELETE /api/auth/login     登出 (clear cookie)
 * GET    /api/auth/login     返回当前 user (用于 /dashboard 初始化)
 *
 * 与 admin/auth 的区别:
 *   - 任意 role 都能登录 (user/blogger/lawyer/admin)
 *   - 写 user_session cookie (不与 admin_session 冲突)
 *   - 博主用户也可在此登录, 自动读出 blogger 状态
 *
 * 安全:
 *   - email/password 走 Supabase Auth (密码校验 + 防爆破)
 *   - 登录后, 自动创建/更新 public.users 记录 (id + email),
 *     role 默认为 'user' (idempotent INSERT ON CONFLICT)
 *   - HttpOnly + SameSite=Lax + Secure(prod) 防止 XSS/CSRF
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
import { setUserSessionCookie, clearUserSessionCookie, requireUser } from '@/lib/user-auth';

const loginSchema = z.object({
  email: z.string().email('请输入有效邮箱'),
  password: z.string().min(8, '密码至少 8 位').max(128),
});

/**
 * 确保 public.users 存在此用户记录
 * (Supabase Auth 创建的 auth.users 不自动同步到 public.users,
 *  我们用 service_role 客户端显式 upsert)
 */
async function ensurePublicUser(userId: string, email: string, displayName?: string | null) {
  if (!supabaseAdmin) return;
  await supabaseAdmin
    .from('users')
    .upsert(
      {
        id: userId,
        email,
        display_name: displayName || null,
        // role 字段有 CHECK 约束 + DEFAULT 'user', 不需要显式设置
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );
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

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: 'INVALID_REQUEST',
        error: '邮箱或密码不合法',
        issues: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;

  // 1. 用 anon client 调 signInWithPassword (Supabase Auth 会校验密码)
  const anonClient = createClient(SUPABASE_INTERNAL_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    return NextResponse.json(
      { code: 'AUTH_FAILED', error: '邮箱或密码错误' },
      { status: 401 }
    );
  }

  // 2. 确保 public.users 存在 (新用户首次登录 / 老用户回访)
  await ensurePublicUser(data.user.id, email, data.user.user_metadata?.display_name);

  // 3. 写 session cookie
  // expires_in 单位: 秒, 我们加 24h 兜底 (但 Supabase JWT 1h 硬过期会先到)
  const expiresAt = Date.now() + (data.session.expires_in ?? 3600) * 1000;
  await setUserSessionCookie(data.session.access_token, expiresAt);

  return NextResponse.json({
    success: true,
    user: {
      id: data.user.id,
      email,
    },
  });
}

export async function DELETE() {
  await clearUserSessionCookie();
  return NextResponse.json({ success: true, message: '已退出' });
}

export async function GET() {
  const result = await requireUser();
  if (!result.authenticated) {
    return NextResponse.json(
      { code: 'UNAUTHENTICATED', error: result.reason },
      { status: result.status }
    );
  }
  return NextResponse.json({ success: true, user: result.user });
}
