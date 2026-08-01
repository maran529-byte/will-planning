/**
 * TEMPORARY TEST ENDPOINT - 删除前先确认 mintUserSessionForEmail 工作正常
 *
 * POST /api/dev/test-mint
 * Body: { openid: string }
 * 
 * 模拟 /wechat/callback 中 mintUserSessionForEmail 的逻辑:
 * 1. 计算 email = wx_<openid>@aiwill.local
 * 2. 调用 supabase.auth.admin.generateLink
 * 3. 调用 anon.auth.verifyOtp
 * 4. 返回 { access_token, expires_in, user_id }
 *
 * 用于在没有真实微信 OAuth 的情况下, 验证 generateLink+verifyOtp 流程
 * 是否能在生产 Supabase 上跑通.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_INTERNAL_URL, SUPABASE_ANON_KEY } from '@/lib/config';
import { supabaseAdmin } from '@/lib/supabase-server';

const schema = z.object({
  openid: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  if (!SUPABASE_INTERNAL_URL || !SUPABASE_ANON_KEY || !supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 未配齐' }, { status: 503 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const email = `wx_${parsed.data.openid}@aiwill.local`;

  const steps: string[] = [];
  try {
    steps.push(`step1: generateLink for ${email}`);
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    if (linkError) {
      return NextResponse.json({ error: 'generateLink_failed', message: linkError.message, steps }, { status: 500 });
    }
    const otp = linkData?.properties?.email_otp;
    if (!otp) {
      return NextResponse.json({ error: 'no_otp', data: linkData, steps }, { status: 500 });
    }
    steps.push(`step2: verifyOtp with email_otp, type=${linkData.properties.verification_type}`);
    const anon = createClient(SUPABASE_INTERNAL_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: verifyData, error: verifyError } = await anon.auth.verifyOtp({
      email,
      token: otp,
      type: (linkData.properties.verification_type as 'magiclink' | 'signup' | 'email' | 'recovery') || 'magiclink',
    });
    if (verifyError) {
      return NextResponse.json({ error: 'verifyOtp_failed', message: verifyError.message, steps }, { status: 500 });
    }
    if (!verifyData?.session) {
      return NextResponse.json({ error: 'no_session', data: verifyData, steps }, { status: 500 });
    }
    const accessToken = verifyData.session.access_token;
    const expiresIn = verifyData.session.expires_in ?? 3600;
    const payload = JSON.stringify({
      access_token: accessToken,
      expires_at: Date.now() + expiresIn * 1000,
    });
    const encoded = Buffer.from(payload, 'utf-8').toString('base64');
    const res = NextResponse.json({
      success: true,
      access_token: accessToken.slice(0, 30) + '...',
      expires_in: expiresIn,
      user_id: verifyData.user?.id,
      user_email: verifyData.user?.email,
      steps,
    });
    res.cookies.set({
      name: 'user_session',
      value: encoded,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24,
      path: '/',
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: 'exception', message: String(e), steps }, { status: 500 });
  }
}
