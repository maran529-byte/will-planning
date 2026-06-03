/**
 * 主动发送客服消息 (受 48h 窗口约束)
 * POST /api/wechat/send-cs-msg
 *
 * 用法: 由后端业务触发 (如订单创建后, 引导用户回公众号看订单)
 * 鉴权: 仅 service_role 可调用, 需校验 X-Internal-Token 头
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { safeSendCsMessage } from '@/lib/wechat/cs-window';
import { assertWeChatMpConfigured } from '@/lib/wechat/config';

const RequestSchema = z.object({
  openid: z.string().min(1).max(64),
  content: z.string().min(1).max(2048),
});

export async function POST(req: NextRequest) {
  // 1. 内部鉴权 (service_role 调用)
  const token = req.headers.get('x-internal-token');
  if (token !== process.env.INTERNAL_API_TOKEN) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    assertWeChatMpConfigured();
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: 'mp_not_configured', message }, { status: 500 });
  }

  // 2. 解析
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { openid, content } = parsed.data;

  // 3. 发送
  const result = await safeSendCsMessage(openid, {
    msgtype: 'text',
    text: { content },
  });

  // 4. 返回结果
  const status = result.sent ? 200 : 425; // 425 Too Early = 窗口未到
  return NextResponse.json(result, { status });
}
