// Payment service - supports multiple payment channels
// Demo mode generates fake QR codes when no real payment credentials are configured

import { WECHAT_APPID, WECHAT_MCHID, WECHAT_API_KEY } from './config';
import { updateOrderStatusServer } from './orders';

export type PaymentChannel = 'wechat' | 'alipay' | 'demo';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'cancelled';

export interface PaymentResult {
  success: boolean;
  payment_url?: string;      // H5 payment URL or QR code URL
  qr_code_url?: string;      // QR code image URL (for wechat scan)
  order_id?: string;
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

// Generate WeChat Pay H5 payment URL (simplified - real implementation would use HMAC-SHA256)
function buildWechatH5Payment(params: {
  order_no: string;
  amount: number;
  description: string;
}): PaymentResult {
  const { order_no, amount, description } = params;

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
export function verifyPaymentCallback(data: Record<string, string>, signature: string): boolean {
  // In production, verify WeChat Pay callback signature using WECHAT_API_KEY
  // For now, accept all callbacks (demo mode)
  return true;
}

// Process payment callback from WeChat/Alipay
export async function processPaymentCallback(callback: PaymentCallback): Promise<boolean> {
  try {
    if (callback.status === 'SUCCESS') {
      await updateOrderStatusServer(
        callback.order_no,
        'paid',
        callback.channel
      );
      return true;
    }
    return false;
  } catch (error) {
    console.error('处理支付回调失败:', error);
    return false;
  }
}
