import { NextRequest, NextResponse } from 'next/server';
import { processPaymentCallback, verifyPaymentCallback } from '@/lib/payment';
import { PaymentChannel } from '@/lib/payment';

// WeChat Pay callback
export async function POST(request: NextRequest) {
  try {
    // Determine the payment channel from headers or body
    const contentType = request.headers.get('content-type') || '';
    const isWechat = contentType.includes('application/xml') || request.headers.get('wechat-signature');

    const channel: PaymentChannel = isWechat ? 'wechat' : 'alipay';

    let callbackData: Record<string, string>;

    if (channel === 'wechat') {
      // WeChat Pay sends XML
      const xmlBody = await request.text();
      callbackData = parseXml(xmlBody);
    } else {
      // Alipay sends JSON or form data
      callbackData = await request.json();
    }

    const { order_no, status, transaction_id, amount } = callbackData;

    if (!order_no) {
      return NextResponse.json(
        { code: 'FAIL', message: '缺少订单号' },
        { status: 400 }
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
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
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
