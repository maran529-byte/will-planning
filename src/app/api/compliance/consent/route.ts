// 强制合规勾选落地 API
// 改版 v1 (2026-07-16, 全球化项目 W1.5)
//
// POST /api/compliance/consent
//   body: { consentType, overseasCountry?, locale, consentText }
//   → 写入 public.compliance_consents 表 (法务留痕, 不可删除)
//
// GET /api/compliance/consent
//   → 查询当前用户所有勾选记录

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { SUPABASE_INTERNAL_URL, SUPABASE_ANON_KEY } from '@/lib/config';

const consentSchema = z.object({
  consentType: z.enum([
    'cross_border_user_identity',
    'legal_disclaimer',
    'pipl_overseas',
  ]),
  overseasCountry: z.string().regex(/^[A-Z]{2}$|^$/).optional(),
  locale: z.enum(['zh-CN', 'en-US']).default('zh-CN'),
  consentText: z.string().min(10).max(2000),
});

async function getSupabaseWithUser() {
  if (!SUPABASE_INTERNAL_URL || !SUPABASE_ANON_KEY) {
    return { supabase: null, user: null };
  }
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;
  const supabase = createClient(SUPABASE_INTERNAL_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {},
  });
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = consentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_PARAMS', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { supabase, user } = await getSupabaseWithUser();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'SUPABASE_NOT_CONFIGURED' }, { status: 503 });
    }
    if (!user) {
      return NextResponse.json({ ok: false, error: 'NOT_AUTHED' }, { status: 401 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || null;
    const ua = req.headers.get('user-agent') || null;

    const { error } = await supabase.from('compliance_consents').insert({
      user_id: user.id,
      consent_type: parsed.data.consentType,
      consent_text: parsed.data.consentText,
      ip_address: ip,
      user_agent: ua,
      overseas_country: parsed.data.overseasCountry || null,
      locale: parsed.data.locale,
    });

    if (error) {
      console.error('[compliance/consent] insert failed', error);
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[compliance/consent] unexpected error', message);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL', message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { supabase, user } = await getSupabaseWithUser();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'SUPABASE_NOT_CONFIGURED' }, { status: 503 });
    }
    if (!user) {
      return NextResponse.json({ ok: false, error: 'NOT_AUTHED' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('compliance_consents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL', message },
      { status: 500 }
    );
  }
}
