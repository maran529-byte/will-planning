/**
 * POST /api/affiliate/click
 *
 * 内部 API: 记录一次推广点击.
 * 由 middleware (edge) 调用. 内部使用, 不需要鉴权 (ref_code 自身是临时凭据).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { recordAffiliateClick } from '@/lib/affiliate';

const clickSchema = z.object({
  ref_code: z.string().regex(/^B[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/),
  ip: z.string().nullable().optional(),
  user_agent: z.string().nullable().optional(),
  landing_path: z.string().min(1).max(255),
  openid: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: 'INVALID_JSON', error: '请求体非 JSON' },
      { status: 400 }
    );
  }

  const parsed = clickSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'INVALID_REQUEST', error: '参数错误' },
      { status: 400 }
    );
  }

  // 静默记录 (失败不抛错, 不影响用户访问)
  try {
    await recordAffiliateClick({
      refCode: parsed.data.ref_code,
      ip: parsed.data.ip || null,
      userAgent: parsed.data.user_agent || null,
      landingPath: parsed.data.landing_path,
      openid: parsed.data.openid || null,
    });
  } catch (err) {
    console.error('[click] record failed:', err);
  }

  return NextResponse.json({ success: true });
}
