/**
 * 用户/博主 鉴权 (Phase B, 2026-06-08)
 *
 * 与 admin-auth.ts 的区别:
 *   - admin_session: 仅 admin role, 用于 /admin/* 后台
 *   - user_session : 任意已登录用户 (role=user|blogger|admin|lawyer),
 *                    用于前台 /dashboard, /affiliate, /orders 等
 *
 * 设计:
 *   - 同一个 Supabase auth.users 账号, 可能有多个 role
 *   - 用户通过邮箱+密码注册 (signUp) → 默认 role='user'
 *   - 通过 /affiliate 申请博主 → 管理员审核通过 → role 仍为 'user',
 *     但多出一条 bloggers 表记录 (user_id 关联), ref_code 发放
 *   - 所以"博主"是"用户"的一种特殊状态, 不是独立账号
 *   - 在 UI 上, "我的" 页面同时显示用户信息和博主状态 (如有)
 *
 * 鉴权流程:
 *   1. /login 提交邮箱+密码
 *   2. /api/auth/login 用 anon 客户端调 supabase.auth.signInWithPassword()
 *   3. 成功 → 写 httpOnly cookie: user_session = { access_token, expires_at }
 *   4. 每个用户路由调 requireUser() 读 cookie → 重建客户端 → getUser()
 *   5. 额外查 public.users 拿 role + display_name 等业务字段
 *
 * 安全:
 *   - access_token 不暴露给 JS (HttpOnly)
 *   - 校验有效期: 24h 软过期 (Supabase JWT 自身 1h 硬过期)
 *   - service_role 仅服务端使用
 *   - admin_session 与 user_session 分离, 防止 admin 误进用户区
 */

import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from './config';
import { supabaseAdmin } from './supabase-server';

export const USER_SESSION_COOKIE = 'user_session';
const SESSION_MAX_AGE = 60 * 60 * 24; // 24h

export interface SessionUser {
  id: string;             // auth.users.id
  email: string;
  role: 'user' | 'blogger' | 'lawyer' | 'admin';
  displayName: string | null;
  // 博主子状态 (如用户已申请博主)
  blogger: {
    id: string;
    status: 'pending' | 'approved' | 'rejected' | 'disabled';
    refCode: string | null;
  } | null;
}

interface SessionPayload {
  access_token: string;
  expires_at: number;
}

/**
 * 内部: 读 user session cookie
 */
export async function readUserSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const raw = store.get(USER_SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
    if (typeof parsed.access_token !== 'string' || typeof parsed.expires_at !== 'number') {
      return null;
    }
    if (Date.now() > parsed.expires_at) {
      return null; // 已过期
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * 内部: 写 user session cookie (HttpOnly)
 */
export async function setUserSessionCookie(accessToken: string, expiresAt: number): Promise<void> {
  const store = await cookies();
  const payload = JSON.stringify({ access_token: accessToken, expires_at: expiresAt });
  const encoded = Buffer.from(payload, 'utf-8').toString('base64');
  store.set(USER_SESSION_COOKIE, encoded, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

/**
 * 内部: 清除 user session
 */
export async function clearUserSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(USER_SESSION_COOKIE);
}

/**
 * 内部: 用 access_token 创建 supabase 客户端 (per-request, 走 anon key + JWT 头)
 */
function createUserClient(accessToken: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

export interface UserAuthResult {
  authenticated: boolean;
  user?: SessionUser;
  reason?: string;
  status: number;
}

/**
 * 鉴权 (服务端, 用于 /dashboard, /affiliate, /orders 等任意用户路由)
 *
 * 返回:
 *  - { authenticated: true, user: SessionUser }  // 通过
 *  - { authenticated: false, reason: 'xxx', status: 401|503 }  // 拒绝
 *
 * 状态码:
 *  - 401: 未登录 / token 失效
 *  - 503: Supabase 未配齐
 */
export async function requireUser(): Promise<UserAuthResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return { authenticated: false, reason: 'Supabase 未配齐, 无法启用用户登录', status: 503 };
  }

  const session = await readUserSession();
  if (!session) {
    return { authenticated: false, reason: '未登录', status: 401 };
  }

  // 1. 验证 token (调 supabase.auth.getUser)
  const userClient = createUserClient(session.access_token);
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return { authenticated: false, reason: '会话已失效, 请重新登录', status: 401 };
  }

  // 2. 查 public.users profile (用 service_role 绕过 RLS)
  if (!supabaseAdmin) {
    return { authenticated: false, reason: '服务端 Supabase client 不可用', status: 503 };
  }
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, email, role, display_name')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) {
    return { authenticated: false, reason: `查询用户失败: ${profileError.message}`, status: 500 };
  }

  // 3. 查 blogger 状态 (可能没申请)
  const { data: blogger } = await supabaseAdmin
    .from('bloggers')
    .select('id, status, ref_code')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  // 没 profile 也能通过 (尚未在我们表里创建, 常见于首次登录的旧账号)
  // 默认 role=user
  return {
    authenticated: true,
    status: 200,
    user: {
      id: userData.user.id,
      email: profile?.email || userData.user.email || '',
      role: (profile?.role as SessionUser['role']) || 'user',
      displayName: profile?.display_name || null,
      blogger: blogger
        ? {
            id: blogger.id,
            status: blogger.status as SessionUser['blogger'] extends infer T ? T extends { status: infer S } ? S : never : never,
            refCode: blogger.ref_code,
          }
        : null,
    },
  };
}

/**
 * 鉴权: 仅检查"已登录" (任意 role), 不返回详细 user 信息.
 * 适合 /affiliate apply (只需知道有用户就行)
 */
export async function requireAuth(): Promise<{
  authenticated: boolean;
  user?: { id: string; email: string };
  reason?: string;
  status: number;
}> {
  const result = await requireUser();
  if (!result.authenticated || !result.user) {
    return {
      authenticated: false,
      reason: result.reason,
      status: result.status,
    };
  }
  return {
    authenticated: true,
    status: 200,
    user: { id: result.user.id, email: result.user.email },
  };
}
