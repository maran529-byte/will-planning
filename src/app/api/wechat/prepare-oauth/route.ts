/**
 * 微信 OAuth 预存储 state
 * POST /api/wechat/prepare-oauth
 *
 * 在跳微信授权之前，先把 state 和 returnTo 存到 cookie
 * （cookie 会随回调请求自动发送到服务端，服务端 callback 无需 fetch）
 */

import { NextRequest, NextResponse } from 'next/server';
import { setOauthStateCookie } from '@/lib/cookie';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { state, returnTo } = body as { state?: string; returnTo?: string };

  if (!state || typeof state !== 'string') {
    return NextResponse.json({ error: 'missing_state' }, { status: 400 });
  }

  await setOauthStateCookie(state, returnTo || '/orders');

  return NextResponse.json({ ok: true });
}
