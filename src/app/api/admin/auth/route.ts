import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import {
  SUPABASE_INTERNAL_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
} from '@/lib/config';
import { supabaseAdmin } from '@/lib/supabase-server';
import { setAdminSessionCookie, clearAdminSessionCookie, requireAdmin } from '@/lib/admin-auth';

/**
 * Admin 登录 / 登出 / 当前用户查询
 *
 * POST   /api/admin/auth     登录 (body: { email, password })
 * DELETE /api/admin/auth     登出 (clear cookie)
 * GET    /api/admin/auth     返回当前 admin user (用于 /admin 页面初始化)
 *
 * 安全:
 *   - email/password 走 Supabase Auth (密码校验 + 防爆破)
 *   - 写 cookie 前, 校验 users.role='admin' (失败不写 cookie)
 *   - HttpOnly + SameSite=Lax + Secure(prod) 防止 XSS/CSRF
 */

const loginSchema = z.object({
  email: z.string().email('请输入有效邮箱'),
  password: z.string().min(8, '密码至少 8 位').max(128),
});

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

  // 2. 校验 role='admin' (用 service_role 查 profile, 绕过 RLS)
  if (!supabaseAdmin) {
    return NextResponse.json(
      { code: 'SUPABASE_NOT_CONFIGURED', error: '服务端 admin client 不可用' },
      { status: 503 }
    );
  }
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, email, role')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json(
      { code: 'PROFILE_NOT_FOUND', error: '用户 profile 不存在' },
      { status: 401 }
    );
  }
  if (profile.role !== 'admin') {
    return NextResponse.json(
      { code: 'NOT_ADMIN', error: '您不是管理员, 无权登录' },
      { status: 403 }
    );
  }

  // 3. 写 session cookie
  // expires_in 单位: 秒, 我们加 24h 兜底 (但 Supabase JWT 1h 硬过期会先到)
  const expiresAt = Date.now() + (data.session.expires_in ?? 3600) * 1000;
  await setAdminSessionCookie(data.session.access_token, expiresAt);

  return NextResponse.json({
    success: true,
    user: { id: profile.id, email: profile.email || email, role: 'admin' },
  });
}

export async function DELETE() {
  await clearAdminSessionCookie();
  return NextResponse.json({ success: true, message: '已退出' });
}

export async function GET() {
  const result = await requireAdmin();
  if (!result.authenticated) {
    return NextResponse.json(
      { code: 'UNAUTHENTICATED', error: result.reason },
      { status: result.status }
    );
  }
  return NextResponse.json({ success: true, user: result.user });
}
