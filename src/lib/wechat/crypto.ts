/**
 * 微信公众号消息加解密 (AES-256-CBC, PKCS#7)
 * @see https://developers.weixin.qq.com/doc/oplatform/Third-party_Platforms/Message_Encryption/Technical_Plan.html
 *
 * 微信安全模式 (encoding=aes) 下:
 *   - POST body: <xml><ToUserName/><Encrypt>BASE64(AES_256_CBC)</Encrypt></xml>
 *   - 被动回复: 必须用相同算法加密后返回
 *   - AES_KEY: 43 位 base64, 取前 32 字符 = 32 字节 key
 *   - IV: AES_KEY 前 16 字节
 *   - 加密内容: random(16B) + msg_len(4B BE) + msg + appid, AES-256-CBC
 *   - 解密后取 msg_len 字节, 验证尾部 appid, 前面就是明文 XML
 */

import { createDecipheriv, createCipheriv, randomBytes } from 'crypto';

const BLOCK_SIZE = 32;

function pkcs7Pad(buf: Buffer): Buffer {
  const pad = BLOCK_SIZE - (buf.length % BLOCK_SIZE);
  const padding = Buffer.alloc(pad, pad);
  return Buffer.concat([buf, padding]);
}

function pkcs7Unpad(buf: Buffer): Buffer {
  const pad = buf[buf.length - 1];
  if (pad < 1 || pad > BLOCK_SIZE) {
    throw new Error('Invalid PKCS#7 padding');
  }
  return buf.subarray(0, buf.length - pad);
}

export interface WeChatCrypto {
  decrypt(encryptedBase64: string): string;       // 返回明文 XML
  encrypt(replyXml: string): string;             // 返回加密后的 base64
}

/**
 * 构造微信加解密实例
 * @param encodingAESKey 43 位 base64 字符串
 * @param appId 公众号 appid (解密后验证 + 加密时拼接)
 */
export function createWeChatCrypto(encodingAESKey: string, appId: string): WeChatCrypto {
  if (!encodingAESKey || encodingAESKey.length !== 43) {
    throw new Error('EncodingAESKey must be 43 chars');
  }
  // 微信官方算法: AES_KEY + IV 都从 base64_decode(EncodingAESKey + "=") 推出来
  //   - 43 字符 base64 → 解码后 32 字节 (微信补 = 凑齐 base64 4 倍数)
  //   - key = full 32 bytes
  //   - iv  = [16:32] (后 16 字节, 与 key 末 16 字节重叠)
  const decoded = Buffer.from(encodingAESKey + '=', 'base64');
  if (decoded.length !== 32) {
    throw new Error(`EncodingAESKey decode wrong size: ${decoded.length}, expected 32`);
  }
  const key = decoded;
  const iv = decoded.subarray(16, 32);

  return {
    decrypt(encryptedBase64: string): string {
      const encrypted = Buffer.from(encryptedBase64, 'base64');
      const decipher = createDecipheriv('aes-256-cbc', key, iv);
      decipher.setAutoPadding(false);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      const unpadded = pkcs7Unpad(decrypted);

      // 格式: random(16B) + msg_len(4B BE) + msg + appid
      const msgLen = unpadded.readUInt32BE(16);
      const msg = unpadded.subarray(20, 20 + msgLen).toString('utf8');
      const tailAppId = unpadded.subarray(20 + msgLen).toString('utf8');
      if (tailAppId !== appId) {
        throw new Error(`AppID mismatch: got ${tailAppId}, expected ${appId}`);
      }
      return msg;
    },

    encrypt(replyXml: string): string {
      const msgBuf = Buffer.from(replyXml, 'utf8');
      const lenBuf = Buffer.alloc(4);
      lenBuf.writeUInt32BE(msgBuf.length, 0);
      const random16 = randomBytes(16);
      const appIdBuf = Buffer.from(appId, 'utf8');
      const plaintext = Buffer.concat([random16, lenBuf, msgBuf, appIdBuf]);
      const padded = pkcs7Pad(plaintext);
      const cipher = createCipheriv('aes-256-cbc', key, iv);
      cipher.setAutoPadding(false);
      const encrypted = Buffer.concat([cipher.update(padded), cipher.final()]);
      return encrypted.toString('base64');
    },
  };
}

/**
 * 构造加密被动回复 XML
 * @param encryptedBase64 加密后的 base64 内容
 * @param signature 签名
 * @param timestamp 时间戳
 * @param nonce 随机串
 */
export function buildEncryptedReply(
  encryptedBase64: string,
  signature: string,
  timestamp: string,
  nonce: string
): string {
  return [
    '<xml>',
    '<Encrypt><![CDATA[' + encryptedBase64 + ']]></Encrypt>',
    '<MsgSignature><![CDATA[' + signature + ']]></MsgSignature>',
    '<TimeStamp>' + timestamp + '</TimeStamp>',
    '<Nonce><![CDATA[' + nonce + ']]></Nonce>',
    '</xml>',
  ].join('');
}