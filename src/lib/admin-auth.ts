/**
 * 管理员鉴权 (Phase 3)
 *
 * 鉴权流程:
 *   1. 用户在 /admin/login 提交邮箱+密码
 *   2. /api/admin/auth 用 anon 客户端调 supabase.auth.signInWithPassword()
 *   3. 成功 → 写 httpOnly cookie: admin_session = { access_token, expires_at }
 *   4. 每个 admin 路由/页面调 requireAdmin(), 读 cookie → 重建 supabase 客户端
 *      (带 access_token) → 调 auth.getUser() 验证 + 查 users.role
 *   5. role='admin' → 通过; 否则 401
 *
 * 安全:
 *   - access_token 不直接存在普通 cookie (HttpOnly + Secure + SameSite=Lax)
 *   - 校验有效期: 24h 软过期 (Supabase JWT 自身 1h 硬过期)
 *   - service_role 不下发到客户端, 仅服务端使用
 *   - 写操作需额外校验 role (defense in depth)
 */

import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from './config';
import { supabaseAdmin } from './supabase-server';

export const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_MAX_AGE = 60 * 60 * 24; // 24h

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin';
}

/**
 * 内部: 读 admin session cookie
 */
export async function readAdminSession(): Promise<{ access_token: string; expires_at: number } | null> {
  const store = await cookies();
  const raw = store.get(ADMIN_SESSION_COOKIE)?.value;
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
 * 内部: 写 admin session cookie (HttpOnly)
 */
export async function setAdminSessionCookie(accessToken: string, expiresAt: number): Promise<void> {
  const store = await cookies();
  const payload = JSON.stringify({ access_token: accessToken, expires_at: expiresAt });
  const encoded = Buffer.from(payload, 'utf-8').toString('base64');
  store.set(ADMIN_SESSION_COOKIE, encoded, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

/**
 * 内部: 清除 admin session
 */
export async function clearAdminSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);
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

export interface AdminAuthResult {
  authenticated: boolean;
  user?: AdminUser;
  reason?: string;
  status: number;
}

/**
 * 鉴权 (服务端, 用于 /admin/* page + /api/admin/* route)
 *
 * 返回:
 *  - { authenticated: true, user: { id, email, role: 'admin' } }  // 通过
 *  - { authenticated: false, reason: 'xxx', status: 401|503 }      // 拒绝
 *
 * 状态码:
 *  - 401: 未登录 / token 失效 / role != 'admin'
 *  - 503: Supabase 未配齐 (SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY 缺一)
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return { authenticated: false, reason: 'Supabase 未配齐, 无法启用管理员后台', status: 503 };
  }

  const session = await readAdminSession();
  if (!session) {
    return { authenticated: false, reason: '未登录', status: 401 };
  }

  // 1. 验证 token (调 supabase.auth.getUser)
  const userClient = createUserClient(session.access_token);
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return { authenticated: false, reason: '会话已失效, 请重新登录', status: 401 };
  }

  // 2. 查 role (用 service_role 绕过 RLS, 但 RLS 本身会保护 user 数据)
  if (!supabaseAdmin) {
    return { authenticated: false, reason: '服务端 Supabase client 不可用', status: 503 };
  }
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, email, role')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) {
    return { authenticated: false, reason: `查询用户失败: ${profileError.message}`, status: 500 };
  }
  if (!profile) {
    return { authenticated: false, reason: '用户 profile 不存在', status: 401 };
  }
  if (profile.role !== 'admin') {
    return { authenticated: false, reason: '您不是管理员, 无权访问', status: 401 };
  }

  return {
    authenticated: true,
    user: {
      id: profile.id,
      email: profile.email || userData.user.email || '',
      role: 'admin',
    },
  };
}

/**
 * 鉴权: 仅检查"已登录" (任意 role), 不要求 admin.
 * 供博主申请 / 仪表盘等普通用户路由使用.
 *
 * 返回: { authenticated, user: { id, email }, reason, status }
 */
export async function requireAuth(): Promise<{
  authenticated: boolean;
  user?: { id: string; email: string };
  reason?: string;
  status: number;
}> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return { authenticated: false, reason: 'Supabase 未配齐, 无法登录', status: 503 };
  }

  const session = await readAdminSession();
  if (!session) {
    return { authenticated: false, reason: '未登录', status: 401 };
  }

  const userClient = createUserClient(session.access_token);
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return { authenticated: false, reason: '会话已失效, 请重新登录', status: 401 };
  }

  return {
    authenticated: true,
    user: {
      id: userData.user.id,
      email: userData.user.email || '',
    },
  };
}
