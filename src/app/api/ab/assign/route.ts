import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import {
  EXPERIMENTS,
  getUserKey,
  pickVariant,
  trackEventServer,
} from '@/lib/ab-testing';
import { getOpenidFromCookie } from '@/lib/cookie';

const Schema = z.object({
  experiment: z.string().min(1).max(50),
  path: z.string().optional(),
});

/**
 * POST /api/ab/assign
 * - 读 openid 或生成匿名 ab_uid cookie
 * - 哈希分配变体, 写入 ab_<exp> cookie
 * - 记录 impression 事件
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'body not json' }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid params' }, { status: 400 });
  }

  const cfg = EXPERIMENTS[parsed.data.experiment];
  if (!cfg) {
    return NextResponse.json({ error: 'unknown experiment' }, { status: 404 });
  }

  const cookieStore = await cookies();
  const cookieName = `ab_${parsed.data.experiment}`;

  // 1. 取/写 ab_uid cookie (匿名用户)
  let abUid = cookieStore.get('ab_uid')?.value;
  if (!abUid) {
    abUid = `anon_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;
    cookieStore.set('ab_uid', abUid, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 天
      path: '/',
    });
  }

  // 2. userKey: 优先 openid, 退化为 ab_uid
  const openid = await getOpenidFromCookie();
  const userKey = openid ? `oid:${openid}` : `uid:${abUid}`;

  // 3. 查已分配 cookie
  let variant = cookieStore.get(cookieName)?.value;
  if (!variant || cfg.variants[variant] === undefined) {
    variant = pickVariant(userKey, parsed.data.experiment, cfg.variants);
    cookieStore.set(cookieName, variant, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 天
      path: '/',
    });
  }

  // 4. 记录 impression 事件 (best effort, 不阻塞响应)
  void trackEventServer({
    experimentName: parsed.data.experiment,
    variant,
    eventType: 'impression',
    userKey,
    path: parsed.data.path,
  }).catch((err) => console.error('track impression failed:', err));

  return NextResponse.json({
    success: true,
    experiment: parsed.data.experiment,
    variant,
    variants: cfg.variants,
  });
}
