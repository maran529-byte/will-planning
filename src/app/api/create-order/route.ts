import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createOrderServer,
  createOrderLocal,
  getOrdersByOpenidServer,
  getOrdersByOpenidLocal,
} from '@/lib/orders';
import { supabaseAdmin } from '@/lib/supabase-server';
import { PLAN_IDS, getPriceCents } from '@/lib/pricing';
import { getOpenidFromCookie } from '@/lib/cookie';

// P0: zod schema for create-order input.
// NOTE: amount is intentionally NOT in the schema — the server looks it up
// from PRICING based on plan. This closes the "client sends amount=1" hole.
// NOTE: openid is also NOT in the schema — read from HTTP-only cookie only.
const createOrderSchema = z.object({
  plan: z.enum(PLAN_IDS),
  docType: z.string().min(1).max(64),
  answers: z.record(z.string(), z.any()),
  will_id: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. 校验登录态 (必须有 openid cookie 才能下单)
    const openid = await getOpenidFromCookie();
    if (!openid) {
      return NextResponse.json(
        {
          code: 'UNAUTHENTICATED',
          error: '请先在公众号绑定微信账号',
          redirect: '/wechat/bind',
        },
        { status: 401 }
      );
    }

    // 2. 校验 body
    const json = await request.json();
    const parsed = createOrderSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'INVALID_REQUEST',
          error: '缺少或无效的参数',
          issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
        },
        { status: 400 }
      );
    }

    const { plan, will_id } = parsed.data;

    // 3. Server-side authoritative price lookup (in 分). The client cannot
    //    influence this value.
    const amountCents = getPriceCents(plan);
    if (amountCents === null) {
      return NextResponse.json(
        { code: 'INVALID_PLAN', error: '无效的套餐类型' },
        { status: 400 }
      );
    }

    // 4. Use Supabase if configured, otherwise fallback to server-side memory
    let order;
    if (supabaseAdmin) {
      order = await createOrderServer({ amount: amountCents, plan, will_id, openid });
    } else {
      order = createOrderLocal({ amount: amountCents, plan, will_id, openid });
    }

    if (!order) {
      return NextResponse.json(
        { code: 'INTERNAL_ERROR', error: '创建订单失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('创建订单失败:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/create-order
 * 列出当前用户 (按 cookie 中的 openid 过滤) 的所有订单.
 *
 * P0 修复: 修复前 GET /api/create-order 返回所有用户订单 (信息泄漏).
 * 修复后: 只返回当前 openid 的订单, 未登录返回空列表.
 */
export async function GET() {
  try {
    const openid = await getOpenidFromCookie();
    // 注意: openid 为空时, 返回空列表, 而非全部订单.
    const orders = supabaseAdmin
      ? await getOrdersByOpenidServer(openid)
      : getOrdersByOpenidLocal(openid);

    return NextResponse.json({
      success: true,
      orders,
      // 调试用: 标识当前是否已登录, 便于前端在空列表时显示"请登录"
      authenticated: !!openid,
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: '服务器错误' },
      { status: 500 }
    );
  }
}
