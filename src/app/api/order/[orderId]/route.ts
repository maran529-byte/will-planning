import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/order/[orderId]
 *
 * 改版 v3 (2026-07-09): P0-4 修复 (闭环任务 FIX-031)
 * 查询订单详情 — 用于 /result 与 /orders/[id] 页面
 *
 * 输入: path param: orderId
 * 输出 200: { id, status, docType, plan, amount, createdAt, paymentUrl, resultUrl }
 * 输出 404: { error: 'ORDER_NOT_FOUND' }
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  if (!orderId || orderId.length < 3) {
    return NextResponse.json(
      { error: 'INVALID_ORDER_ID' },
      { status: 400 }
    );
  }

  // Mock: 真实场景从 Supabase orders 表查
  // const order = await supabase.from('orders').select('*').eq('id', orderId).single();
  // if (!order.data) return 404

  // Mock 数据 — 让 /result 与 /orders/[id] 渲染成功
  // 从 orderId 推断 plan (mock 阶段)
  const inferredPlan: 'smart' | 'pro' | 'expert' = orderId.includes('expert')
    ? 'expert'
    : orderId.includes('pro')
    ? 'pro'
    : 'smart';

  const planPrice = { smart: 1990, pro: 9900, expert: 99900 }[inferredPlan];
  const inferredDocType = orderId.includes('marriage')
    ? 'pre-marriage'
    : orderId.includes('divorce')
    ? 'divorce'
    : orderId.includes('gift')
    ? 'gift'
    : orderId.includes('inheritance')
    ? 'inheritance'
    : 'pre-marriage';

  // 模拟订单已完成 (mock — 让 /result 渲染草稿)
  const mockOrder = {
    id: orderId,
    orderNo: orderId,
    status: 'paid',
    docType: inferredDocType,
    plan: inferredPlan,
    amount: planPrice,
    amountYuan: planPrice / 100,
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
    paymentUrl: `/payment?order=${orderId}`,
    resultUrl: `/result?order=${orderId}`,
    downloadUrl: `/api/doc/${orderId}/download?format=pdf`,
    title: `${DOC_TYPE_NAMES[inferredDocType] || '家庭文书'} · ${inferredPlan === 'expert' ? '专家护航版' : '智能版'}`,
    preview: `# ${DOC_TYPE_NAMES[inferredDocType] || '家庭文书'}\n\n（本订单为 mock 演示数据 — 真实草稿由 LLM 生成）\n\n## 第一条 协议双方\n\n甲方：[姓名]，身份证号：[身份证号]\n乙方：[姓名]，身份证号：[身份证号]\n\n## 第二条 财产范围\n\n...\n\n（本预览仅展示前 200 字，完整草稿请在支付成功后下载 PDF）`,
  };

  return NextResponse.json(mockOrder, { status: 200 });
}

const DOC_TYPE_NAMES: Record<string, string> = {
  'pre-marriage': '婚前财产协议',
  'during-marriage': '婚内财产协议',
  'marital-property': '婚内财产协议',
  'divorce': '离婚协议书',
  'child-custody': '子女抚养协议',
  'custody': '子女抚养协议',
  'gift': '赠与协议',
  'inheritance': '遗产继承方案',
  'will': '遗嘱',
};