import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getOpenidFromCookie } from '@/lib/cookie';
import { trackEventServer } from '@/lib/ab-testing';

const Schema = z.object({
  experiment: z.string().min(1).max(50),
  variant: z.string().min(1).max(5),
  event_type: z.enum(['impression', 'click', 'conversion']),
  value: z.number().int().optional(),
  path: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * POST /api/ab/event
 * 客户端上报事件 (click / conversion)
 * impression 在 /api/ab/assign 时已记录, 这里只接受 click/conversion
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

  const cookieStore = await cookies();
  const abUid = cookieStore.get('ab_uid')?.value;
  const openid = await getOpenidFromCookie();
  const userKey = openid ? `oid:${openid}` : abUid ? `uid:${abUid}` : 'unknown';

  await trackEventServer({
    experimentName: parsed.data.experiment,
    variant: parsed.data.variant,
    eventType: parsed.data.event_type,
    userKey,
    value: parsed.data.value,
    path: parsed.data.path,
    metadata: parsed.data.metadata,
  });

  return NextResponse.json({ success: true });
}
