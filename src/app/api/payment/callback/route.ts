import { NextRequest, NextResponse } from 'next/server';
import { WECHAT_API_KEY } from '@/lib/config';
import {
  verifyWechatV3Signature,
  decryptWechatV3Resource,
  parseWechatSignatureHeader,
  type WechatV3Resource,
} from '@/lib/wechat-pay-crypto';
import { processWechatV3Callback } from '@/lib/payment-events';

/**
 * 微信支付 V3 回调端点.
 *
 * 处理流程:
 *  1. 读 Wechatpay-* headers, 验签 (RSA-SHA256, 5 分钟时间戳窗口)
 *  2. 解析 body JSON, 解密 resource 字段 (AES-256-GCM)
 *  3. 调 processWechatV3Callback 处理 (幂等 + 金额校验 + 状态校验)
 *  4. 返回 V3 协议要求的 JSON 响应
 *
 * 支付宝回调待实现 (本仓库现走 manual 模式 + admin 后台)
 *
 * 环境变量:
 *  - WECHAT_MP_API_V3_KEY (or WECHAT_API_KEY)  32 字节 APIv3 密钥
 *  - WECHAT_PAY_PLAT_CERT  PEM 格式微信平台证书公钥 (从 /v3/certificates 下载)
 *  - 如果两者都未配, 降级为 demo 模式 (仅开发环境)
 */

interface WechatV3CallbackBody {
  id: string;
  create_time: string;
  resource_type: string;
  event_type: string;
  summary: string;
  resource: WechatV3Resource;
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  const isWechatV3 = contentType.includes('application/json')
    && (request.headers.get('wechatpay-signature') || request.headers.get('Wechatpay-Signature'));

  if (!isWechatV3) {
    return NextResponse.json(
      { code: 'INVALID_REQUEST', error: '非微信 V3 回调或格式错误' },
      { status: 400 }
    );
  }

  // 1. 读 raw body + 签名
  const rawBody = await request.text();
  const sigHeader = request.headers.get('wechatpay-signature')
    || request.headers.get('Wechatpay-Signature')
    || '';
  const ts = request.headers.get('wechatpay-timestamp')
    || request.headers.get('Wechatpay-Timestamp')
    || '';
  const nonce = request.headers.get('wechatpay-nonce')
    || request.headers.get('Wechatpay-Nonce')
    || '';

  // 2. 验签 (有 plat cert 时启用, 否则降级 demo)
  const platCert = process.env.WECHAT_PAY_PLAT_CERT || '';
  if (platCert) {
    const { timestamp, nonce: hNonce, signature } = parseWechatSignatureHeader(sigHeader);
    const verifyResult = verifyWechatV3Signature({
      timestamp: timestamp || ts,
      nonce: hNonce || nonce,
      body: rawBody,
      signature,
      platCert,
    });
    if (!verifyResult.valid) {
      console.error('WeChat V3 验签失败:', verifyResult.reason);
      return NextResponse.json(
        { code: 'INVALID_SIGNATURE', error: verifyResult.reason || '签名校验失败' },
        { status: 401 }
      );
    }
  } else if (process.env.NODE_ENV === 'production') {
    // 生产环境强制要求 plat cert, 避免无签名放行
    console.error('生产环境未配置 WECHAT_PAY_PLAT_CERT, 拒绝回调');
    return NextResponse.json(
      { code: 'PLAT_CERT_MISSING', error: '微信平台证书未配置' },
      { status: 503 }
    );
  } else {
    console.warn('[DEV MODE] WECHAT_PAY_PLAT_CERT 未配置, 跳过验签');
  }

  // 3. 解析 body
  let body: WechatV3CallbackBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { code: 'INVALID_JSON', error: 'body 不是合法 JSON' },
      { status: 400 }
    );
  }

  if (!body.resource || !body.resource.ciphertext) {
    return NextResponse.json(
      { code: 'MISSING_RESOURCE', error: 'resource 字段缺失' },
      { status: 400 }
    );
  }

  // 4. 解密 resource (有 APIv3 key 时)
  let decrypted: {
    out_trade_no: string;
    transaction_id: string;
    trade_state: string;
    amount: { total: number; payer_total: number };
    bank_type?: string;
    success_time?: string;
    openid?: string;
    mchid?: string;
  };
  if (WECHAT_API_KEY) {
    try {
      decrypted = decryptWechatV3Resource(body.resource, WECHAT_API_KEY);
    } catch (err) {
      console.error('WeChat V3 resource 解密失败:', err);
      return NextResponse.json(
        {
          code: 'DECRYPT_FAILED',
          error: err instanceof Error ? err.message : '解密失败',
        },
        { status: 400 }
      );
    }
  } else {
    // 演示模式: 用 rawBody 的伪字段 (供本地测试)
    console.warn('[DEV MODE] WECHAT_API_KEY 未配, 跳过 resource 解密');
    decrypted = {
      out_trade_no: 'DEV_' + Date.now(),
      transaction_id: 'DEV_TXN_' + Date.now(),
      trade_state: 'SUCCESS',
      amount: { total: 0, payer_total: 0 },
    };
  }

  // 5. 处理业务 (幂等 + 校验)
  const result = await processWechatV3Callback({
    transactionId: decrypted.transaction_id,
    outTradeNo: decrypted.out_trade_no,
    amountTotalFen: decrypted.amount.total,
    tradeState: decrypted.trade_state,
    decryptedPayload: decrypted as unknown as Record<string, unknown>,
  });

  // 6. 返回 V3 协议响应
  if (result.success) {
    return NextResponse.json({
      code: 'SUCCESS',
      message: '成功',
    });
  } else {
    // 失败仍返回 200 + FAIL, 避免微信重复推送 (除非是系统错误)
    return NextResponse.json({
      code: 'FAIL',
      message: result.reason || '处理失败',
    });
  }
}

// =============================================================================
// 手动支付回调 (供 /admin/orders/[id]/mark-paid 内部使用, 不暴露 HTTP)
// 注: admin 后台 mark-paid 直接调 markOrderPaidManually, 不走此端点
// =============================================================================

// GET 仅用于健康检查
export async function GET() {
  return NextResponse.json({
    ok: true,
    wechat_v3: !!process.env.WECHAT_PAY_PLAT_CERT,
    api_v3_key: !!WECHAT_API_KEY,
    note: 'POST 端点, 微信主动回调',
  });
}
