// Payment service - supports multiple payment channels
// Demo mode generates fake QR codes when no real payment credentials are configured
//
// 改版 v4 (2026-06-08): 引入 'hupijiao' 渠道 (虎皮椒个人微信聚合支付)
// - 4 个 env (HUPIJIAO_APPID/SECRET/GATEWAY/NOTIFY_URL) 全配时, 走 hupijiao 通道
// - 客户端点 "微信支付" → 跳到虎皮椒托管收银台 → 支付完成 → 虎皮椒回调 /api/payment/hupijiao-callback
// - 服务端验签 (MD5) → mark paid → 客户 30s 轮询看到状态变化
// - 未配齐时, 自动 fallback 到 manual (管理员收款码 + 人工确认)
//
// 改版 v3 (2026-06-07): 引入 'manual' 渠道 (Phase 1, 个人微信收款码 + 人工确认)
// - 当 WECHAT_* 未配齐时, 业务方可在 Vercel env 配 PUBLIC_PAYMENT_QR_URL = 管理员收款码 URL
// - 客户端看到的是真实收款码 + 订单号水印
// - 客户点"我已支付"按钮 → 仅展示"等待客服确认"提示, 不实际更新订单 (避免与管理员后台冲突)
// - 管理员在 /admin/orders (Phase 3) mark paid, 客户 30s 轮询看到状态变化

import { createHash } from 'crypto';
import {
  WECHAT_APPID,
  WECHAT_MCHID,
  WECHAT_API_KEY,
  HUPIJIAO_APPID,
  HUPIJIAO_APP_SECRET,
  HUPIJIAO_GATEWAY_URL,
  HUPIJIAO_NOTIFY_URL,
} from './config';
import { updateOrderStatusServer } from './orders';

export type PaymentChannel = 'wechat' | 'alipay' | 'demo' | 'manual' | 'hupijiao';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'cancelled';

export interface PaymentResult {
  success: boolean;
  payment_url?: string;      // H5 payment URL or QR code URL
  qr_code_url?: string;      // QR code image URL (for wechat scan)
  order_id?: string;
  note?: string;             // 客户需知 (manual 模式专用: 订单号 + 留言提示)
  error?: string;
}

export interface PaymentCallback {
  order_no: string;
  status: 'SUCCESS' | 'FAIL';
  transaction_id?: string;
  amount?: number;
  channel: PaymentChannel;
}

// Check if real WeChat Pay is configured
export function isWechatConfigured(): boolean {
  return !!(WECHAT_APPID && WECHAT_MCHID && WECHAT_API_KEY);
}

/**
 * 检查是否启用虎皮椒 (Hupijiao / xunhupay) 个人微信聚合支付.
 * 4 个 env (APPID + SECRET + GATEWAY + NOTIFY_URL) 全配 → true.
 * 注意: NOTIFY_URL 也算"已配" (因为我们会从 SITE_URL 兜底, 但兜底结果在生产可能不可达,
 * 所以这里要求 HUPIJIAO_NOTIFY_URL 显式配置, 避免静默错误).
 */
export function isHupijiaoConfigured(): boolean {
  return !!(HUPIJIAO_APPID && HUPIJIAO_APP_SECRET && HUPIJIAO_GATEWAY_URL && HUPIJIAO_NOTIFY_URL);
}

/**
 * 检查是否启用「个人微信收款」手动模式 (Phase 1 MVP 收款方式).
 * 触发条件: PUBLIC_PAYMENT_QR_URL env 已配 (管理员上传了个人微信收款码).
 * 注意: 即便真实 WeChat Pay 已配齐, 也可以通过不设此 env 来强制走 demo.
 */
export function isManualPaymentConfigured(): boolean {
  return !!process.env.PUBLIC_PAYMENT_QR_URL;
}

/**
 * 构造「个人微信收款」支付结果.
 * - qr_code_url: 管理员个人微信收款码 (PNG/JPG)
 * - order_no: 让客户扫码后留言/备注, 便于客服对账
 * - note: 客户需知 (如何留言, 客服微信联系方式, 等待时间等)
 */
export function buildManualPayment(params: {
  order_no: string;
  amount: number;
}): PaymentResult {
  const qrUrl = process.env.PUBLIC_PAYMENT_QR_URL || '';
  if (!qrUrl) {
    return { success: false, error: 'PUBLIC_PAYMENT_QR_URL 未配置' };
  }
  return {
    success: true,
    qr_code_url: qrUrl,
    order_id: params.order_no,
    // 客户看到的提示文案
    note: `订单号 ${params.order_no} · 请扫码支付 ¥${params.amount}, 留言订单号 (我们会在数分钟内确认)`,
  };
}

/**
 * Hupijiao (虎皮椒) 签名生成.
 * 规则: 按 key 字母升序排列所有非空参数, 用 `&key=value` 拼接, 末尾追加 app_secret, 整体 MD5.
 * 注意: 必须先排序再追加 secret, 然后再 MD5. 不可 URL-encode 后再签 (虎皮椒服务端用原文比较).
 *
 * @param params 业务参数 (不含 sign 字段)
 * @param secret 商户 app_secret
 * @returns 32 位小写 MD5 十六进制
 */
export function hupijiaoSign(params: Record<string, string>, secret: string): string {
  const sortedKeys = Object.keys(params)
    .filter((k) => params[k] !== '' && params[k] != null)
    .sort();
  const signStr = sortedKeys.map((k) => `${k}=${params[k]}`).join('&') + secret;
  return createHash('md5').update(signStr).digest('hex');
}

/**
 * Hupijiao 回调验签.
 * 与 hupijiaoSign 同算法, 客户端传 sign, 服务端重算并比对.
 */
export function verifyHupijiaoCallback(params: Record<string, string>): boolean {
  if (!HUPIJIAO_APP_SECRET) return false;
  const { sign, ...rest } = params;
  if (!sign) return false;
  const expected = hupijiaoSign(rest, HUPIJIAO_APP_SECRET);
  return expected === sign;
}

/**
 * 构造虎皮椒支付跳转 URL.
 *
 * 文档: https://www.xunhupay.com/doc/api/pay.html
 *   GET 方式提交, 浏览器跳转到 `https://api.xunhupay.com/payment/do.html?<query>` 即可.
 *   收银台会按 UA 判断: 微信内 → JSAPI 调起微信支付; 非微信内 → 显示聚合收款码 (含微信/支付宝).
 *
 * @param params.order_no      商户订单号 (我们的 orders.order_no, 客户付款时附加)
 * @param params.amount        金额, 单位: 元 (Hupijiao 接受两位小数字符串, 如 "19.90")
 * @param params.description   商品标题
 * @param params.return_url    支付完成后浏览器同步跳转 URL (业务方)
 * @returns 成功时返回 payment_url (供前端 window.location 跳转)
 */
export function buildHupijiaoPayment(params: {
  order_no: string;
  amount: number;
  description: string;
  return_url?: string;
}): PaymentResult {
  if (!isHupijiaoConfigured()) {
    return { success: false, error: '虎皮椒支付未配置 (HUPIJIAO_* env 缺失)' };
  }

  // Hupijiao 要求金额格式: 字符串, 2 位小数
  const totalAmount = params.amount.toFixed(2);
  const time = Math.floor(Date.now() / 1000).toString();

  // 业务参数 (不含 sign)
  const bizParams: Record<string, string> = {
    version: '1.1',
    appid: HUPIJIAO_APPID,
    trade_order_id: params.order_no,
    total_amount: totalAmount,
    title: params.description.slice(0, 64), // Hupijiao 限制 64 字符
    time,
    notify_url: HUPIJIAO_NOTIFY_URL,
  };
  if (params.return_url) {
    bizParams.return_url = params.return_url;
  }

  // 签名
  const sign = hupijiaoSign(bizParams, HUPIJIAO_APP_SECRET);

  // 拼 query string (URL-encode)
  const query = new URLSearchParams({ ...bizParams, sign }).toString();
  const paymentUrl = `${HUPIJIAO_GATEWAY_URL}?${query}`;

  return {
    success: true,
    payment_url: paymentUrl,
    order_id: params.order_no,
  };
}

// Generate WeChat Pay H5 payment URL (simplified - real implementation would use HMAC-SHA256)
function buildWechatH5Payment(params: {
  order_no: string;
  amount: number;
  description: string;
}): PaymentResult {
  const { order_no, amount: _amount, description: _description } = params;

  // WeChat Trade_type = NATIVE (QR code payment)
  // In production, call https://api.mch.weixin.qq.com/v3/pay/transactions/native
  // with proper signing using WECHAT_API_KEY

  // For now, return a mock payment URL that shows the order flow
  const mockPaymentUrl = `weixin://wxpay/bizpayurl?appid=${WECHAT_APPID}&mch_id=${WECHAT_MCHID}&nonce_str=${Date.now()}&product_id=${order_no}`;

  return {
    success: true,
    qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mockPaymentUrl)}`,
    order_id: order_no,
  };
}

// Initiate payment for an order
export async function initiatePayment(params: {
  order_id: string;
  order_no: string;
  amount: number;
  description: string;
  channel: PaymentChannel;
}): Promise<PaymentResult> {
  const { order_no, amount, description, channel } = params;

  // 改版 v4: hupijiao 通道 - 跳到虎皮椒收银台 (无内部二维码, 走 H5 跳转)
  if (channel === 'hupijiao') {
    if (!isHupijiaoConfigured()) {
      return { success: false, error: '虎皮椒支付未配置, 已拒绝发起支付 (请检查 HUPIJIAO_* env)' };
    }
    return buildHupijiaoPayment({
      order_no,
      amount,
      description,
      return_url: `${process.env.SITE_URL || 'http://localhost:3000'}/orders`,
    });
  }

  // Manual mode (Phase 1 MVP) - 优先于 demo
  // 触发条件: 客户端显式传 channel='manual' 或 wechat 通道 + 未配齐 WECHAT_* + 已配 PUBLIC_PAYMENT_QR_URL
  if (channel === 'manual') {
    return buildManualPayment({ order_no, amount });
  }

  // Demo mode
  if (channel === 'demo' || (!isWechatConfigured() && channel === 'wechat')) {
    const demoOrderNo = `DEMO_${order_no}_${Date.now()}`;
    return {
      success: true,
      qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`演示支付订单: ${demoOrderNo} 金额: ¥${amount}`)}`,
      order_id: order_no,
    };
  }

  // WeChat Pay
  if (channel === 'wechat') {
    return buildWechatH5Payment({ order_no, amount, description });
  }

  // Alipay (placeholder - would call Alipay API)
  if (channel === 'alipay') {
    return {
      success: true,
      payment_url: `https://openapi.alipay.com/gateway.do?out_trade_no=${order_no}&total_amount=${amount}`,
      order_id: order_no,
    };
  }

  return { success: false, error: '不支持的支付渠道' };
}

// Verify payment callback signature
export function verifyPaymentCallback(_data: Record<string, string>, _signature: string): boolean {
  // In production, verify WeChat Pay callback signature using WECHAT_API_KEY
  // For now, accept all callbacks (demo mode)
  return true;
}

// Process payment callback from WeChat/Alipay/manual/hupijiao
// 改版 v4 (2026-06-08): 成功后触发 Phase 7 佣金钩子 (best-effort).
//   - 与 markOrderPaidManually 一致, 任何渠道支付的订单都应触发推广佣金
//   - 静默失败: 佣金是辅助系统, 不应阻塞支付确认
export async function processPaymentCallback(callback: PaymentCallback): Promise<boolean> {
  try {
    if (callback.status === 'SUCCESS') {
      // 渠道收窄: 仅 wechat/alipay/manual/hupijiao 传递给 DAL, 'demo' 不持久化 channel
      const ch =
        callback.channel === 'wechat' ||
        callback.channel === 'alipay' ||
        callback.channel === 'manual' ||
        callback.channel === 'hupijiao'
          ? callback.channel
          : undefined;
      const updated = await updateOrderStatusServer(callback.order_no, 'paid', ch);
      if (!updated) {
        console.error('[processPaymentCallback] 订单更新失败', { order_no: callback.order_no });
        return false;
      }

      // Phase 7 推广佣金钩子 (best-effort)
      // 静默失败: 推广系统是辅助功能, 不应阻塞支付确认
      try {
        const { createCommissionForOrder } = await import('./affiliate');
        const commissionResult = await createCommissionForOrder({
          orderId: updated.id,
          orderAmountCents: updated.amount,
        });
        if (commissionResult.success) {
          console.log(
            `[processPaymentCallback] commission created for order ${updated.id}: ` +
            `${commissionResult.commission?.commission_cents} cents`
          );
        } else if (
          commissionResult.reason !== '佣金已存在' &&
          commissionResult.reason !== '无推广 cookie'
        ) {
          console.warn(
            `[processPaymentCallback] commission skipped: ${commissionResult.reason}`
          );
        }
      } catch (err) {
        console.error('[processPaymentCallback] commission hook failed:', err);
      }

      return true;
    }
    return false;
  } catch (error) {
    console.error('处理支付回调失败:', error);
    return false;
  }
}
