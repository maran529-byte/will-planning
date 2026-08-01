/**
 * 用户注册 (POST /api/auth/register)
 *
 * Body: { email, password, display_name?, acceptTerms: true, ref_code?: string }
 *
 * 流程 (2026-07-29 改版):
 *   1. 调 supabase.auth.admin.createUser (绕过 SMTP, email_confirm=true 直接创建)
 *      - 之前用 anon signUp, 但 Supabase 默认会发"确认邮件",
 *        自建实例无 SMTP 配置导致 signup 总是 400
 *   2. 成功后, 用 service_role 在 public.users 创建对应记录
 *   3. 如果有 ref_code, 调用 bind_referral_and_reward() 给推荐人发 ¥2 红包
 *   4. 用 generateLink + verifyOtp 签发 access_token, 自动写 user_session cookie
 *      (让用户体验更顺畅, 不需要再去登录页输入一遍密码)
 *
 * 安全:
 *   - 密码长度至少 8 位 (zod schema)
 *   - 邮箱格式校验
 *   - 必须勾选 acceptTerms
 *   - 重复邮箱检测: createUser 失败 message 含 'already' → 409 EMAIL_TAKEN
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
import { REFERRAL_REWARD_CENTS, canBindReferral } from '@/lib/referral';
import { setUserSessionCookie } from '@/lib/user-auth';

const registerSchema = z.object({
  email: z.string().email('请输入有效邮箱'),
  password: z.string().min(8, '密码至少 8 位').max(128),
  display_name: z.string().min(1).max(40).optional(),
  acceptTerms: z.boolean().refine((v) => v === true, {
    message: '请先同意服务条款与隐私政策',
  }),
  ref_code: z.string().min(1).max(64).optional(),
});

export async function POST(request: NextRequest) {
  if (!SUPABASE_INTERNAL_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { code: 'SUPABASE_NOT_CONFIGURED', error: 'Supabase 未配齐, 无法注册' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (e) {
    console.error('[register] request.json() failed:', (e as Error)?.message, 'content-type=', request.headers.get('content-type'));
    return NextResponse.json({ code: 'INVALID_JSON', error: '请求格式错误', detail: (e as Error)?.message }, { status: 400 });
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

  const { email, password, display_name, ref_code } = parsed.data;

  if (!supabaseAdmin) {
    return NextResponse.json(
      { code: 'SUPABASE_NOT_CONFIGURED', error: '服务端 admin client 不可用' },
      { status: 503 }
    );
  }

  // 1. 调 Supabase admin.createUser (绕过 SMTP, email_confirm=true 直接生效)
  //    - 失败: 重复邮箱 → 409; 其他 → 400
  const { data: createdData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: display_name || '' },
  });

  if (createError || !createdData?.user) {
    const msg = createError?.message || '注册失败';
    if (/already registered|already exists|user already|email already/i.test(msg)) {
      return NextResponse.json(
        { code: 'EMAIL_TAKEN', error: '该邮箱已注册, 请直接登录' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { code: 'SIGNUP_FAILED', error: msg },
      { status: 400 }
    );
  }

  const userId = createdData.user.id;

  // 2. 在 public.users 同步创建 (service_role 绕过 RLS)
  const { error: upsertError } = await supabaseAdmin
    .from('users')
    .upsert(
      {
        id: userId,
        email,
        display_name: display_name || null,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );

  if (upsertError) {
    console.error('[register] public.users upsert failed:', upsertError.message);
  }

  // 3. 推荐人绑定 + ¥2 红包奖励 (业务铁律 v1.0)
  let referralBound = false;
  if (ref_code && canBindReferral(ref_code, userId)) {
    try {
      const { data: rewardData, error: rewardErr } = await supabaseAdmin.rpc(
        'bind_referral_and_reward',
        {
          p_referrer_id: ref_code,
          p_referee_id: userId,
          p_reward_cents: REFERRAL_REWARD_CENTS,
        }
      );
      if (rewardErr) {
        console.error('[register] bind_referral_and_reward failed:', rewardErr.message);
      } else {
        referralBound = rewardData === true;
        if (referralBound) {
          console.log(
            `[register] 推荐人 ${ref_code} 成功绑定被推荐人 ${userId}, 发放 ¥${REFERRAL_REWARD_CENTS / 100} 红包`
          );
        }
      }
    } catch (e) {
      console.error('[register] referral binding error:', (e as Error)?.message);
    }
  }

  // 4. 自动登录: 用 admin.generateLink + anon.verifyOtp 拿 access_token
  //    (magic-link 通道, 不发邮件, 仅取 token)
  let accessToken: string | null = null;
  let expiresIn = 3600;
  try {
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    if (!linkErr && linkData?.properties?.email_otp) {
      const anon = createClient(SUPABASE_INTERNAL_URL, SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const verifyType = (linkData.properties.verification_type || 'magiclink') as
        | 'magiclink' | 'signup' | 'email' | 'recovery';
      const { data: verifyData, error: verifyErr } = await anon.auth.verifyOtp({
        email,
        token: linkData.properties.email_otp,
        type: verifyType,
      });
      if (!verifyErr && verifyData?.session) {
        accessToken = verifyData.session.access_token;
        expiresIn = verifyData.session.expires_in ?? 3600;
      }
    }
  } catch (e) {
    console.warn('[register] auto sign-in failed:', (e as Error)?.message);
  }

  if (accessToken) {
    const expiresAt = Date.now() + expiresIn * 1000;
    await setUserSessionCookie(accessToken, expiresAt);
  }

  // 5. 返回成功
  return NextResponse.json({
    success: true,
    user: { id: userId, email },
    autoSignedIn: !!accessToken,
    needsEmailConfirmation: false,
    message: accessToken
      ? '注册成功, 已自动登录'
      : '注册成功, 请前往登录',
    referral_bound: referralBound,
  });
}
