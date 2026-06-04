/**
 * 临时调试接口 — 返回 WECHAT_MP_TOKEN 的 SHA256 指纹 (不含明文)
 * 用来对比 Vercel env 实际生效的 token 和用户填的 token 是否完全一致
 *
 * 调试完成后删除本文件
 */
import { NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { WECHAT_MP_TOKEN } from '@/lib/wechat/config';

export async function GET() {
  const token = WECHAT_MP_TOKEN || '';
  const sha256 = token
    ? crypto.createHash('sha256').update(token).digest('hex')
    : '';
  // 显式字节级信息: 长度 + 每个字符的 charCode
  // 这样能看出是否有不可见字符
  const codes: number[] = [];
  for (let i = 0; i < token.length; i++) {
    codes.push(token.charCodeAt(i));
  }
  return NextResponse.json({
    length: token.length,
    sha256_prefix: sha256.slice(0, 16), // 只返前 16 字符, 足以对比
    first_4: token.slice(0, 4),
    last_4: token.slice(-4),
    codes, // 全 32 个字符的 ASCII (数字字母在 48-122 之间)
  });
}
