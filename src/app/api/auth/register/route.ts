/**
 * 用户注册 (POST /api/auth/register)
 *
 * Body: { email, password, display_name?, acceptTerms: true }
 *
 * 流程:
 *   1. 调 supabase.auth.signUp (Supabase 帮我们做密码强度 + 重复检查)
 *   2. 成功后, 用 service_role 在 public.users 创建对应记录
 *   3. (可选) 自动登录: 写 user_session cookie, 让用户体验更顺畅
 *
 * 重要: Supabase 默认会发"确认邮件"。生产环境需要配置 SMTP,
 *  本地开发可以关闭 (Supabase Dashboard > Authentication > Providers
 *  > Email > Confirm email = off). 不关闭的话用户需先点邮件链接
 *  才能登录.
 *
 * 安全:
 *   - 密码长度至少 8 位 (zod schema)
 *   - 邮箱格式校验
 *   - 必须勾选 acceptTerms
 *   - 不直接返回 session (避免自动登录绕过邮件确认流程)
 *     — 改为返回成功状态, 让前端跳 /login 引导用户登录
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
} from '@/lib/config';
import { supabaseAdmin } from '@/lib/supabase-server';

const registerSchema = z.object({
  email: z.string().email('请输入有效邮箱'),
  password: z.string().min(8, '密码至少 8 位').max(128),
  display_name: z.string().min(1).max(40).optional(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: '请先同意服务条款与隐私政策' }),
  }),
});

export async function POST(request: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { code: 'SUPABASE_NOT_CONFIGURED', error: 'Supabase 未配齐, 无法注册' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', error: '请求格式错误' }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: 'INVALID_REQUEST',
        error: '表单字段不合法',
        issues: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const { email, password, display_name } = parsed.data;

  // 1. 调 Supabase signUp
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await anonClient.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: display_name || '' }, // 写入 auth.user_metadata
      emailRedirectTo: process.env.SITE_URL
        ? `${process.env.SITE_URL.replace(/\/+$/, '')}/login?registered=1`
        : undefined,
    },
  });

  if (error) {
    // 重复注册 → 401
    if (/already registered|already exists|user already|email already/i.test(error.message)) {
      return NextResponse.json(
        { code: 'EMAIL_TAKEN', error: '该邮箱已注册, 请直接登录' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { code: 'SIGNUP_FAILED', error: error.message },
      { status: 400 }
    );
  }

  if (!data.user) {
    return NextResponse.json(
      { code: 'SIGNUP_NO_USER', error: '注册未返回用户信息' },
      { status: 500 }
    );
  }

  // 2. 在 public.users 同步创建 (service_role 绕过 RLS)
  // 注: Supabase 默认会发确认邮件, 此时 session 可能为 null
  if (!supabaseAdmin) {
    return NextResponse.json(
      { code: 'SUPABASE_NOT_CONFIGURED', error: '服务端 admin client 不可用' },
      { status: 503 }
    );
  }
  const { error: upsertError } = await supabaseAdmin
    .from('users')
    .upsert(
      {
        id: data.user.id,
        email,
        display_name: display_name || null,
        // role DEFAULT 'user', 不显式设置
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );

  if (upsertError) {
    // 不要因 public.users 同步失败让用户觉得注册失败
    // (auth.users 已创建, 用户可登录后再补 profile)
    console.error('public.users upsert failed:', upsertError);
  }

  // 3. 返回成功
  // 不写 cookie — 让用户去登录页手动登录 (符合 Supabase 默认邮件确认流程)
  return NextResponse.json({
    success: true,
    user: { id: data.user.id, email },
    // 提示前端是否需要引导用户去邮箱确认
    needsEmailConfirmation: !data.session,
    message: data.session
      ? '注册成功, 已自动登录'
      : '注册成功, 请查收邮箱确认链接后登录',
  });
}
