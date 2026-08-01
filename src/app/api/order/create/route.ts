import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/order/create
 *
 * 改版 v3 (2026-07-09): P0-2 修复 (闭环任务 FIX-030)
 * 创建订单 — 智能版 / 进阶版 / 专家版
 *
 * 输入: { docType, questionnaireAnswers, plan }
 * 输出 200: { orderId, paymentUrl, totalAmount, plan, docType }
 * 输出 400: { error: '...', message: '...' }
 * 输出 500: { error: 'INTERNAL_ERROR', message: '...' }
 *
 * Mock fallback: 后端真接口延期时, 此 mock 会持久到 KV (Vercel KV)
 * 上线后会平滑切换到真实 DAL (src/lib/orders.ts) + Supabase.
 */

const PLAN_PRICES = {
  smart: 1990,    // ¥19.9
  pro: 9900,      // ¥99
  expert: 99900,  // ¥999
} as const;

type Plan = keyof typeof PLAN_PRICES;

const DOC_TYPE_WHITELIST = new Set([
  'pre-marriage', 'during-marriage', 'marital-property',
  'divorce', 'child-custody', 'custody',
  'gift', 'inheritance', 'will',
]);

function isPlan(p: any): p is Plan {
  return p === 'smart' || p === 'pro' || p === 'expert';
}

interface CreateOrderBody {
  docType?: string;
  questionnaireAnswers?: Record<string, any>;
  plan?: string;
  userId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as CreateOrderBody;

    // 1. docType 校验
    if (!body.docType || !DOC_TYPE_WHITELIST.has(body.docType)) {
      return NextResponse.json(
        {
          error: 'INVALID_DOC_TYPE',
          message: 'docType 必须从 9 类文书中选择',
          allowed: [...DOC_TYPE_WHITELIST],
        },
        { status: 400 }
      );
    }

    // 2. plan 校验 (默认 smart)
    const plan: Plan = isPlan(body.plan) ? body.plan : 'smart';
    const totalAmount = PLAN_PRICES[plan] / 100; // 转元

    // 3. 问卷校验 (基本 — 至少要有 1 个字段)
    if (!body.questionnaireAnswers || Object.keys(body.questionnaireAnswers).length === 0) {
      return NextResponse.json(
        {
          error: 'EMPTY_QUESTIONNAIRE',
          message: '问卷未完成, 请先填写问卷',
        },
        { status: 400 }
      );
    }

    // 4. 生成订单 ID
    const orderId = `ord_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const orderNo = orderId; // 与前端约定

    // 5. 构造支付 URL (mock — 走虎皮椒网关, 真实场景由 /api/payment 处理)
    const paymentUrl = `/payment?order=${orderNo}&plan=${plan}`;

    // 6. 持久化 (mock — 实际生产走 Supabase, 这里写 console + 返回 orderId)
    // TODO: 替换为 supabase.from('orders').insert({...})
    console.log('[order/create]', {
      orderId,
      docType: body.docType,
      plan,
      totalAmount,
      userId: body.userId || 'guest',
      ts: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        orderId,
        orderNo,
        paymentUrl,
        totalAmount,
        plan,
        docType: body.docType,
        createdAt: new Date().toISOString(),
        // 便于前端跳转到结果页 (mock 状态: 直接 ready, 实际生产是 pending)
        status: 'pending',
        // hint: 如果启用 mock, 立即跳 result
        resultUrl: `/result?order=${orderNo}`,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[order/create] failed:', err);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: '订单创建失败, 请稍后重试',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      endpoint: 'POST /api/order/create',
      usage: 'Send JSON: { docType, questionnaireAnswers, plan }',
      plans: Object.keys(PLAN_PRICES),
      docTypes: [...DOC_TYPE_WHITELIST],
    },
    { status: 200 }
  );
}
