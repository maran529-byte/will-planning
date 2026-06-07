import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { markOrderRefunded } from '@/lib/orders';
import { requireAdmin } from '@/lib/admin-auth';

/**
 * 退款 (Phase 3 管理员后台)
 *
 * POST /api/admin/orders/[id]/refund
 * Body: { reason: string }   // 必填, 存 audit log (P1)
 *
 * 状态机: 仅 paid → refunded 允许
 */

const bodySchema = z.object({
  reason: z.string().min(1, '请填写退款原因').max(500),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authenticated) {
    return NextResponse.json({ code: 'UNAUTHENTICATED', error: auth.reason }, { status: auth.status });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ code: 'INVALID_REQUEST', error: '缺少订单 id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', error: '请求格式错误' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'INVALID_REQUEST', error: '参数不合法', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const result = await markOrderRefunded({
    orderId: id,
    adminId: auth.user!.id,
    reason: parsed.data.reason,
  });

  if (!result.success) {
    return NextResponse.json(
      { code: 'REFUND_FAILED', error: result.reason },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, order: result.order });
}
