// 虎皮椒 (Hupijiao / xunhupay) 支付回调端点.
//
// 改版 v4 (2026-06-08): 新增 hupijiao 通道, 这是 MVP 上线后的主推支付通道.
// 个人微信收款, 适合无营业执照的小团队.
//
// 回调流程 (Hupijiao 主动调用):
//   1. Hupijiao 在用户支付完成后, 通过 GET/POST 调用我们配置的 notify_url
//   2. 我们从 query/form 中读 trade_order_id/status/total_amount/sign 等
//   3. 服务端重算 sign 并比对 (MD5 签名校验)
//   4. 调 markOrderPaidManually 类似的状态机:
//        - pending → paid (幂等: 已 paid 直接返回 success)
//        - 金额校验: 必须等于订单金额
//   5. 返回纯字符串 "success" (Hupijiao 才会停止重试; 返回其他任意内容 → 重试)
//
// 安全:
//   - 严格验签 (MD5)
//   - 金额校验 (防订单金额被篡改)
//   - 幂等 (同一订单多次回调不会重复处理)
//   - 佣金钩子失败不影响主流程
//
// 环境变量:
//   - HUPIJIAO_APP_SECRET  32 位字符串
//   - HUPIJIAO_NOTIFY_URL  完整可公网访问的 URL (Vercel 部署时填)
//
// 参考: https://www.xunhupay.com/doc/api/pay.html

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyHupijiaoCallback,
  processPaymentCallback,
  isHupijiaoConfigured,
} from '@/lib/payment';
import { getOrderByOrderNoServer } from '@/lib/orders';

// 业务参数 (从 query 或 form 中读)
interface HupijiaoCallbackParams {
  appid?: string;
  trade_order_id?: string;
  order_no?: string;        // 虎皮椒自己的订单号
  total_amount?: string;    // 字符串, 2 位小数
  status?: string;          // 'OD' = 已完成, 其它值 (如 'WP'/'CD') 视为未成功
  sign?: string;
  // 可选: 实际支付方式 / 通道 / 时间等
  type?: string;
  pay_time?: string;
  nonce_str?: string;
}

/**
 * 从 NextRequest 抽取业务参数 (兼容 GET query + POST form + POST JSON).
 */
async function extractParams(request: NextRequest): Promise<HupijiaoCallbackParams> {
  const method = request.method.toUpperCase();
  if (method === 'GET') {
    // query string
    const url = new URL(request.url);
    return {
      appid: url.searchParams.get('appid') || undefined,
      trade_order_id: url.searchParams.get('trade_order_id') || undefined,
      order_no: url.searchParams.get('order_no') || undefined,
      total_amount: url.searchParams.get('total_amount') || undefined,
      status: url.searchParams.get('status') || undefined,
      sign: url.searchParams.get('sign') || undefined,
      type: url.searchParams.get('type') || undefined,
      pay_time: url.searchParams.get('pay_time') || undefined,
      nonce_str: url.searchParams.get('nonce_str') || undefined,
    };
  }
  if (method === 'POST') {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/x-www-form-urlencoded')) {
      const form = await request.formData();
      return {
        appid: (form.get('appid') as string) || undefined,
        trade_order_id: (form.get('trade_order_id') as string) || undefined,
        order_no: (form.get('order_no') as string) || undefined,
        total_amount: (form.get('total_amount') as string) || undefined,
        status: (form.get('status') as string) || undefined,
        sign: (form.get('sign') as string) || undefined,
        type: (form.get('type') as string) || undefined,
        pay_time: (form.get('pay_time') as string) || undefined,
        nonce_str: (form.get('nonce_str') as string) || undefined,
      };
    }
    // JSON body 兼容 (有些集成商会用 JSON 推)
    try {
      const json = await request.json();
      return {
        appid: json.appid,
        trade_order_id: json.trade_order_id,
        order_no: json.order_no,
        total_amount: json.total_amount,
        status: json.status,
        sign: json.sign,
        type: json.type,
        pay_time: json.pay_time,
        nonce_str: json.nonce_str,
      };
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * GET 处理器: Hupijiao 主动 GET 调用 (浏览器同步跳转 + 服务器通知都支持 GET).
 */
export async function GET(request: NextRequest) {
  return handle(request);
}

/**
 * POST 处理器: Hupijiao 主动 POST 调用 (退化为 GET 也兼容, 但 POST 仍支持).
 */
export async function POST(request: NextRequest) {
  return handle(request);
}

async function handle(request: NextRequest) {
  // 1. 配置检查
  if (!isHupijiaoConfigured()) {
    console.error('[hupijiao-callback] HUPIJIAO_* env 未配, 拒绝回调');
    return new NextResponse('server not configured', { status: 503 });
  }

  // 2. 抽参
  const params = await extractParams(request);
  if (!params.trade_order_id) {
    return new NextResponse('missing trade_order_id', { status: 400 });
  }

  // 3. 验签 (hupijiaoSign 算法: 排序非空参数 + app_secret → MD5)
  if (!verifyHupijiaoCallback(params as Record<string, string>)) {
    console.error('[hupijiao-callback] 验签失败', {
      trade_order_id: params.trade_order_id,
      sign: params.sign,
    });
    return new NextResponse('invalid signature', { status: 401 });
  }

  // 4. 业务校验: status 必须是 'OD' (订单完成)
  //    Hupijiao 状态枚举: OD=已完成, WP=等待支付, CD=已取消, RF=已退款
  if (params.status !== 'OD') {
    console.warn('[hupijiao-callback] 收到非成功状态', {
      trade_order_id: params.trade_order_id,
      status: params.status,
    });
    // 即便状态不是 OD, 也返回 success (Hupijiao 不需要重试; 我们也不会改订单)
    return new NextResponse('success', { status: 200 });
  }

  // 5. 查订单 (确保存在且状态可改)
  const order = await getOrderByOrderNoServer(params.trade_order_id);
  if (!order) {
    console.error('[hupijiao-callback] 订单不存在', { trade_order_id: params.trade_order_id });
    // 返回 success 避免无限重试 (订单不存在就是不存在, 重试也没用)
    return new NextResponse('success', { status: 200 });
  }

  // 6. 金额校验 (防回调金额被篡改)
  if (params.total_amount) {
    const callbackAmount = Number(params.total_amount);
    // 订单金额单位是分 (cents), Hupijiao 回调金额单位是元, 比较时统一
    const orderAmountYuan = order.amount / 100;
    if (Math.abs(callbackAmount - orderAmountYuan) > 0.01) {
      console.error('[hupijiao-callback] 金额不匹配', {
        trade_order_id: params.trade_order_id,
        callbackAmount,
        orderAmountYuan,
      });
      return new NextResponse('amount mismatch', { status: 400 });
    }
  }

  // 7. 幂等: 已 paid 的订单直接返回 success (不重置 paid_at)
  if (order.status === 'paid') {
    console.log('[hupijiao-callback] 订单已 paid, 幂等返回', {
      trade_order_id: params.trade_order_id,
    });
    return new NextResponse('success', { status: 200 });
  }

  // 8. 状态机: 仅 pending → paid 允许
  if (order.status !== 'pending') {
    console.warn('[hupijiao-callback] 订单状态不允许改', {
      trade_order_id: params.trade_order_id,
      status: order.status,
    });
    return new NextResponse('success', { status: 200 });
  }

  // 9. 调 processPaymentCallback (mark paid + 触发佣金钩子, 全部由 DAL 内部 best-effort 处理)
  //    order_no 参数这里传 order.id (UUID) — processPaymentCallback 内部 updateOrderStatusServer
  //    用 .eq('id', ...) 查询. Hupijiao 自己的订单号 (params.order_no) 写到 transaction_id.
  const ok = await processPaymentCallback({
    order_no: order.id,
    status: 'SUCCESS',
    transaction_id: params.order_no,    // 虎皮椒的订单号
    amount: order.amount,
    channel: 'hupijiao',
  });

  if (!ok) {
    console.error('[hupijiao-callback] mark paid 失败', {
      trade_order_id: params.trade_order_id,
    });
    // 不返回 success → Hupijiao 会按策略重试
    return new NextResponse('process failed', { status: 500 });
  }

  console.log('[hupijiao-callback] mark paid 成功', {
    trade_order_id: params.trade_order_id,
    transaction_id: params.order_no,
  });

  // 10. 返回纯字符串 "success" (Hupijiao 才停止重试)
  return new NextResponse('success', { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
