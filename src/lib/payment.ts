// Payment service - supports multiple payment channels
// Demo mode generates fake QR codes when no real payment credentials are configured
//
// 改版 v3 (2026-06-07): 引入 'manual' 渠道 (Phase 1, 个人微信收款码 + 人工确认)
// - 当 WECHAT_* 未配齐时, 业务方可在 Vercel env 配 PUBLIC_PAYMENT_QR_URL = 管理员收款码 URL
// - 客户端看到的是真实收款码 + 订单号水印
// - 客户点"我已支付"按钮 → 仅展示"等待客服确认"提示, 不实际更新订单 (避免与管理员后台冲突)
// - 管理员在 /admin/orders (Phase 3) mark paid, 客户 30s 轮询看到状态变化

import { WECHAT_APPID, WECHAT_MCHID, WECHAT_API_KEY } from './config';
import { updateOrderStatusServer } from './orders';

export type PaymentChannel = 'wechat' | 'alipay' | 'demo' | 'manual';
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

// Process payment callback from WeChat/Alipay/manual
export async function processPaymentCallback(callback: PaymentCallback): Promise<boolean> {
  try {
    if (callback.status === 'SUCCESS') {
      // 渠道收窄: 仅 wechat/alipay/manual 传递给 DAL, 'demo' 不持久化 channel
      const ch =
        callback.channel === 'wechat' ||
        callback.channel === 'alipay' ||
        callback.channel === 'manual'
          ? callback.channel
          : undefined;
      await updateOrderStatusServer(callback.order_no, 'paid', ch);
      return true;
    }
    return false;
  } catch (error) {
    console.error('处理支付回调失败:', error);
    return false;
  }
}
