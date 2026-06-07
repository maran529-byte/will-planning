import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { markOrderPaidManually } from '@/lib/orders';
import { requireAdmin } from '@/lib/admin-auth';

/**
 * 手动 mark paid (Phase 1 收款流程)
 *
 * POST /api/admin/orders/[id]/mark-paid
 * Body: {
 *   payment_method: 'wechat_personal' | 'alipay_personal',
 *   note?: string
 * }
 *
 * 流程: Phase 3 admin 在 /admin/orders 看到 pending 订单 → 收到客户微信截图
 *       → 点"标记已支付" → 调此端点 → 状态变 paid, 客户 30s 轮询看到
 *
 * 安全:
 *  - requireAdmin() 校验 role='admin'
 *  - markOrderPaidManually 内部已有幂等 + 状态机保护
 */

const bodySchema = z.object({
  payment_method: z.enum(['wechat_personal', 'alipay_personal']),
  note: z.string().max(500).optional(),
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

  const result = await markOrderPaidManually({
    orderId: id,
    adminId: auth.user!.id,
    paymentMethod: parsed.data.payment_method,
    note: parsed.data.note,
  });

  if (!result.success) {
    return NextResponse.json(
      { code: 'MARK_PAID_FAILED', error: result.reason },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    order: result.order,
    reason: result.reason,
  });
}
