/**
 * 微信公众号签名验证
 * @see https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Message_encryption_and_decryption.html
 *
 * 用于:
 *   1. 服务器 URL 验证 (GET 请求带 echostr)
 *   2. 消息真实性校验 (POST 请求, 校验 signature)
 */

import * as crypto from 'crypto';
import { WECHAT_MP_TOKEN } from './config';

/**
 * 校验微信签名
 *
 * 签名算法: sha1(sort([token, timestamp, nonce]).join(''))
 * 微信会把 timestamp/nonce 放在 query, 期望 signature === sha1(token+timestamp+nonce)
 */
export function verifySignature(opts: {
  signature: string;
  timestamp: string;
  nonce: string;
}): boolean {
  if (!WECHAT_MP_TOKEN) {
    throw new Error('WECHAT_MP_TOKEN 未配置');
  }
  const arr = [WECHAT_MP_TOKEN, opts.timestamp, opts.nonce].sort();
  const sha1 = crypto.createHash('sha1').update(arr.join('')).digest('hex');
  return sha1 === opts.signature;
}

/**
 * 快速签名校验 (常量时间比较, 防 timing attack)
 */
export function verifySignatureSafe(opts: {
  signature: string;
  timestamp: string;
  nonce: string;
}): boolean {
  if (!WECHAT_MP_TOKEN) {
    throw new Error('WECHAT_MP_TOKEN 未配置');
  }
  const arr = [WECHAT_MP_TOKEN, opts.timestamp, opts.nonce].sort();
  const expected = crypto.createHash('sha1').update(arr.join('')).digest('hex');
  // crypto.timingSafeEqual 需要等长 buffer
  if (expected.length !== opts.signature.length) {
    return false;
  }
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(opts.signature, 'hex')
  );
}
