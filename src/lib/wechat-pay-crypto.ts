/**
 * 微信支付 V3 API 签名验证 + 资源解密.
 *
 * 微信 V3 回调机制:
 *  1. 微信用商户公钥 (非 APIv3 密钥) 对回调 body 签名
 *  2. 微信在 Header 写入 Wechatpay-Signature: <timestamp>\n<nonce>\n<signature>
 *  3. 签名 = RSA-SHA256(timestamp + "\n" + nonce + "\n" + body + "\n", 微信私钥)
 *  4. 商户用微信公钥 (从 /v3/certificates 接口下载) 验签
 *  5. body 里的 resource.ciphertext 是 AES-256-GCM(APIv3密钥) 加密
 *  6. 解密: key=APIv3密钥, nonce=resource.nonce, ciphertext, aad=resource.associated_data
 *
 * 签名验签需要的「微信平台证书」需要从 https://api.mch.weixin.qq.com/v3/certificates
 * 定期下载并缓存. 简化版: 启动时一次性下载到 env (WECHAT_PAY_PLAT_CERT).
 *
 * 资源: 微信支付 V3 开发文档
 *  https://pay.weixin.qq.com/wiki/doc/apiv3/wxpay/pay/transactions/chapter3_12.shtml
 */
import { createVerify, createDecipheriv } from 'crypto';

// =============================================================================
// 签名验证
// =============================================================================

export interface WechatV3VerifyResult {
  valid: boolean;
  reason?: string;
}

/**
 * 验证微信支付 V3 回调签名.
 *
 * @param timestamp  从 Wechatpay-Timestamp header
 * @param nonce      从 Wechatpay-Nonce header
 * @param body       原始 body 字符串 (未解析)
 * @param signature  从 Wechatpay-Signature header
 * @param platCert   微信平台证书 (PEM 格式的公钥)
 */
export function verifyWechatV3Signature(params: {
  timestamp: string;
  nonce: string;
  body: string;
  signature: string;
  platCert: string;
}): WechatV3VerifyResult {
  try {
    // 1. 时间戳校验 (5 分钟内, 防重放)
    const ts = parseInt(params.timestamp, 10);
    if (Number.isNaN(ts)) {
      return { valid: false, reason: 'timestamp 不是数字' };
    }
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > 300) {
      return { valid: false, reason: `timestamp 超出 5 分钟 (差 ${now - ts}s)` };
    }

    // 2. 拼接待签字符串
    const message = `${params.timestamp}\n${params.nonce}\n${params.body}\n`;

    // 3. 公钥验签
    const verifier = createVerify('RSA-SHA256');
    verifier.update(message, 'utf8');
    verifier.end();

    // 微信 base64 编码, 与 Node Buffer 互转
    const sigBuffer = Buffer.from(params.signature, 'base64');
    const ok = verifier.verify(params.platCert, sigBuffer);

    return { valid: ok, reason: ok ? undefined : '签名不匹配' };
  } catch (err) {
    return {
      valid: false,
      reason: err instanceof Error ? err.message : '验签异常',
    };
  }
}

// =============================================================================
// 资源解密
// =============================================================================

export interface WechatV3Resource {
  ciphertext: string;       // base64 编码
  associated_data?: string; // 可选 AAD
  nonce: string;            // 解密 IV
}

export interface WechatDecrypted {
  out_trade_no: string;
  transaction_id: string;
  trade_state: string;          // SUCCESS / REFUND / NOTPAY / CLOSED / REVOKED
  amount: { total: number; payer_total: number };
  bank_type?: string;
  success_time?: string;
  openid?: string;
  mchid?: string;
}

/**
 * 解密微信支付 V3 资源 (AES-256-GCM).
 *
 * 密钥 = APIv3 密钥 (32 字节), IV = resource.nonce,
 * AAD = resource.associated_data (可空)
 *
 * @param resource  回调 body 中的 resource 字段
 * @param apiV3Key  APIv3 密钥 (字符串)
 */
export function decryptWechatV3Resource(
  resource: WechatV3Resource,
  apiV3Key: string
): WechatDecrypted {
  if (!apiV3Key || apiV3Key.length !== 32) {
    throw new Error(`APIv3 密钥长度必须为 32 字节, 当前 ${apiV3Key.length}`);
  }

  // 1. 准备 key + IV
  const key = Buffer.from(apiV3Key, 'utf8');
  const iv = Buffer.from(resource.nonce, 'utf8');
  const aad = resource.associated_data || '';

  // 2. 密文: ciphertext base64 解码, 末尾 16 字节是 auth tag
  const ctBuf = Buffer.from(resource.ciphertext, 'base64');
  if (ctBuf.length < 16) {
    throw new Error('ciphertext 太短, 缺少 auth tag');
  }
  const ciphertext = ctBuf.subarray(0, ctBuf.length - 16);
  const authTag = ctBuf.subarray(ctBuf.length - 16);

  // 3. AES-256-GCM 解密
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  if (aad) decipher.setAAD(Buffer.from(aad, 'utf8'));
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');

  return JSON.parse(plain) as WechatDecrypted;
}

// =============================================================================
// 解析 Wechatpay-Signature header
// =============================================================================

/**
 * 解析 Wechatpay-Signature header.
 * 格式: "t=1234567890,nonce_str=abc,signature=xxx" 或 "timestamp\nnonce\nsignature"
 * 实际微信发的是 "t=...,nonce=...,sign=...,wx_serial_no=..." (V3 实际格式)
 *
 * @returns 解析后的对象, 缺字段则对应值为空
 */
export function parseWechatSignatureHeader(header: string): {
  timestamp: string;
  nonce: string;
  signature: string;
} {
  if (!header) return { timestamp: '', nonce: '', signature: '' };

  // 格式 1: k=v, k=v
  if (header.includes('=')) {
    const parts = header.split(',').map((s) => s.trim());
    const obj: Record<string, string> = {};
    for (const p of parts) {
      const [k, v] = p.split('=');
      if (k && v) obj[k.trim()] = v.trim();
    }
    return {
      timestamp: obj.t || obj.timestamp || '',
      nonce: obj.nonce || obj.nonce_str || '',
      signature: obj.signature || obj.sign || '',
    };
  }

  // 格式 2: 三行 (timestamp\nnonce\nsignature)
  const lines = header.split('\n').map((s) => s.trim());
  return {
    timestamp: lines[0] || '',
    nonce: lines[1] || '',
    signature: lines[2] || '',
  };
}
