import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { processPaymentCallback, verifyPaymentCallback } from '@/lib/payment';
import { PaymentChannel } from '@/lib/payment';

// P0: zod schema for payment callback payload.
// We accept both flat JSON (alipay) and CDATA-wrapped XML (wechat) — the
// parser for XML is below; this schema validates the final flat object.
const callbackSchema = z.object({
  order_no: z.string().min(1).max(128),
  status: z.string().min(1).max(32),
  transaction_id: z.string().max(128).optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  channel: z.enum(['wechat', 'alipay']).optional(),
});

// WeChat Pay callback
export async function POST(request: NextRequest) {
  try {
    // Determine the payment channel from headers or body
    const contentType = request.headers.get('content-type') || '';
    const isWechat = contentType.includes('application/xml') || request.headers.get('wechat-signature');

    const channel: PaymentChannel = isWechat ? 'wechat' : 'alipay';

    let rawData: Record<string, string>;

    if (channel === 'wechat') {
      // WeChat Pay sends XML
      const xmlBody = await request.text();
      rawData = parseXml(xmlBody);
    } else {
      // Alipay sends JSON or form data
      rawData = await request.json();
    }

    // P0: zod validation of callback payload. Reject malformed callbacks
    // with a clear 400 instead of silently accepting them.
    const parsed = callbackSchema.safeParse(rawData);
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'INVALID_REQUEST',
          error: '回调参数无效',
          issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
        },
        { status: 400 }
      );
    }

    const { order_no, status, transaction_id, amount } = parsed.data;

    // P0 STUB: signature verification is currently a no-op because we don't
    // have real WeChat/Stripe credentials yet. This MUST be replaced with
    // the channel-specific signature check once WECHAT_API_V3_KEY /
    // STRIPE_WEBHOOK_SECRET / ALIPAY_PUBLIC_KEY are configured in Vercel
    // env vars and merchant accounts are live.
    //
    // TODO(security): Replace this stub with the real channel verification:
    //   - WeChat V3: verify Wechatpay-Signature (RSA-SHA256) and decrypt
    //     the `resource` field with AES-256-GCM using WECHAT_API_V3_KEY.
    //   - Alipay: verify `sign` with RSA2 using ALIPAY_PUBLIC_KEY.
    //   - Stripe: verify `Stripe-Signature` (HMAC-SHA256) using
    //     STRIPE_WEBHOOK_SECRET.
    // Until then, this endpoint is unsafe in production.
    const signature = request.headers.get('wechat-signature') || '';
    const signatureValid = verifyPaymentCallback(rawData, signature);
    if (!signatureValid) {
      return NextResponse.json(
        { code: 'INVALID_SIGNATURE', error: '签名校验失败' },
        { status: 401 }
      );
    }

    const success = await processPaymentCallback({
      order_no,
      status: status === 'SUCCESS' ? 'SUCCESS' : 'FAIL',
      transaction_id,
      amount: amount ? Number(amount) / 100 : undefined, // WeChat amounts are in cents
      channel,
    });

    if (channel === 'wechat') {
      // WeChat requires XML response
      return new NextResponse(
        success ? '<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>' : '<xml><return_code><![CDATA[FAIL]]></return_code></xml>',
        { headers: { 'Content-Type': 'application/xml' } }
      );
    }

    return NextResponse.json({ success });
  } catch (error) {
    console.error('支付回调处理失败:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: '服务器错误' },
      { status: 500 }
    );
  }
}

// Simple XML parser for WeChat Pay callbacks
function parseXml(xml: string): Record<string, string> {
  const result: Record<string, string> = {};
  const matches = xml.matchAll(/<(\w+)><!\[CDATA\[([^\]]*)\]\]><\/\1>|<(\w+)>([^<]*)<\/\3>/g);
  for (const match of matches) {
    const key = match[1] || match[3];
    const value = match[2] || match[4];
    result[key] = value;
  }
  return result;
}
