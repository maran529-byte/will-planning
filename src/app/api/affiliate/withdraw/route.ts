/**
 * POST /api/affiliate/withdraw
 *
 * 申请提现.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/admin-auth';
import { getBloggerByUserId, requestWithdrawal } from '@/lib/affiliate';

const withdrawSchema = z.object({
  // 改版 v1.0 (2026-07-24): 提现门槛 ¥10 → ¥50 (工作室批准)
  amount_cents: z.number().int().min(5000).max(10000000),  // 最小 ¥50, 最大 ¥100000
  contact_method: z.enum(['alipay', 'wechat', 'bank']),
  contact_info: z.string().min(4).max(64),
});

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session.authenticated || !session.user) {
    return NextResponse.json(
      { code: 'UNAUTHENTICATED', error: session.reason || '请先登录' },
      { status: session.status || 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: 'INVALID_JSON', error: '请求体非 JSON' },
      { status: 400 }
    );
  }

  const parsed = withdrawSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: 'INVALID_REQUEST',
        error: '参数错误',
        issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
      },
      { status: 400 }
    );
  }

  const blogger = await getBloggerByUserId(session.user.id);
  if (!blogger) {
    return NextResponse.json(
      { code: 'NOT_BLOGGER', error: '您还不是博主' },
      { status: 404 }
    );
  }
  if (blogger.status !== 'approved') {
    return NextResponse.json(
      { code: 'NOT_APPROVED', error: '博主账号未通过审核' },
      { status: 403 }
    );
  }

  const result = await requestWithdrawal({
    bloggerId: blogger.id,
    amountCents: parsed.data.amount_cents,
    contactMethod: parsed.data.contact_method,
    contactInfo: parsed.data.contact_info,
  });

  if (!result.success) {
    return NextResponse.json(
      { code: 'WITHDRAW_FAILED', error: result.reason },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    withdrawal: result.withdrawal,
  });
}
