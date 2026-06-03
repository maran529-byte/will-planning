import { NextRequest, NextResponse } from 'next/server';
import { WECHAT_API_BASE, WECHAT_MP_APP_ID } from '@/lib/wechat/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  return NextResponse.json({
    WECHAT_PROXY_URL_raw: process.env.WECHAT_PROXY_URL ?? null,
    WECHAT_API_BASE_resolved: WECHAT_API_BASE,
    WECHAT_MP_APP_ID: WECHAT_MP_APP_ID,
    WECHAT_MP_APP_SECRET_set: !!process.env.WECHAT_MP_APP_SECRET,
    WECHAT_MP_TOKEN_set: !!process.env.WECHAT_MP_TOKEN,
    timestamp: new Date().toISOString(),
  });
}
