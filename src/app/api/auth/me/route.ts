import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config';

export async function GET(_request: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { code: 'SUPABASE_NOT_CONFIGURED', error: 'Supabase 未配置' },
      { status: 503 }
    );
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;

  if (!accessToken) {
    return NextResponse.json(
      { code: 'NOT_AUTHENTICATED', user: null },
      { status: 200 }
    );
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json(
        { code: 'INVALID_SESSION', user: null },
        { status: 200 }
      );
    }

    return NextResponse.json({
      code: 'OK',
      user: {
        id: user.id,
        email: user.email,
        display_name: (user.user_metadata as Record<string, unknown>)?.display_name as string ?? null,
      },
    });
  } catch (e) {
    console.error('[auth/me] failed:', (e as Error)?.message);
    return NextResponse.json(
      { code: 'AUTH_CHECK_FAILED', error: '鉴权检查失败' },
      { status: 500 }
    );
  }
}