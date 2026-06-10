/**
 * 公众号服务器回调 (URL 验证 + 消息 / 事件接收)
 * GET  /api/wechat/mp-callback?signature=...&timestamp=...&nonce=...&echostr=...
 *        → 返回 echostr (URL 验证)
 * POST /api/wechat/mp-callback  (XML body)
 *        → 解析消息/事件, 被动回复 (XML)
 *
 * 处理:
 *   - 关注 / 取消关注
 *   - 文本消息 (关键词: help / 价格 / 备案 / 人工 / 订单)
 *   - 菜单点击 (CLICK)
 *   - 菜单跳转 (VIEW) - 微信不回调, 忽略
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureSafe } from '@/lib/wechat/verify';
import { parseWeChatXml, buildTextReply, buildNewsReply, buildEmptyResponse, WeChatRecvMessage } from '@/lib/wechat/xml';
import { recordUserInteraction } from '@/lib/wechat/cs-window';
import { assertWeChatMpConfigured } from '@/lib/wechat/config';
import { supabaseAdmin } from '@/lib/supabase-server';

// ============================================================================
// GET: URL 验证
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    assertWeChatMpConfigured();
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new NextResponse(message, { status: 500 });
  }

  const { searchParams } = req.nextUrl;
  const signature = searchParams.get('signature');
  const timestamp = searchParams.get('timestamp');
  const nonce = searchParams.get('nonce');
  const echostr = searchParams.get('echostr');

  if (!signature || !timestamp || !nonce || !echostr) {
    return new NextResponse('missing params', { status: 400 });
  }

  const valid = verifySignatureSafe({ signature, timestamp, nonce });
  if (!valid) {
    return new NextResponse('invalid signature', { status: 403 });
  }

  // 验证成功, 返回 echostr
  return new NextResponse(echostr, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

// ============================================================================
// POST: 消息 / 事件
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    assertWeChatMpConfigured();
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new NextResponse(message, { status: 500 });
  }

  const { searchParams } = req.nextUrl;
  const signature = searchParams.get('signature');
  const timestamp = searchParams.get('timestamp');
  const nonce = searchParams.get('nonce');

  if (!signature || !timestamp || !nonce) {
    return new NextResponse('missing params', { status: 400 });
  }

  if (!verifySignatureSafe({ signature, timestamp, nonce })) {
    return new NextResponse('invalid signature', { status: 403 });
  }

  const xml = await req.text();
  let msg: WeChatRecvMessage;
  try {
    msg = parseWeChatXml(xml);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('parseWeChatXml failed:', message, xml);
    return new NextResponse(buildEmptyResponse(), {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // 路由
  const reply = await handleMessage(msg);

  return new NextResponse(reply, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}

// ============================================================================
// 消息路由
// ============================================================================

async function handleMessage(msg: WeChatRecvMessage): Promise<string> {
  const openid = msg.fromUserName;

  // ----- 事件 -----
  if (msg.msgType === 'event') {
    switch (msg.event) {
      case 'subscribe':
        // 关注: 记录 + 欢迎语
        await recordUserInteractionSafe(openid, { menuKey: 'subscribe' });
        return buildTextReply(msg, getWelcomeText());

      case 'unsubscribe':
        // 取消关注: 仅记录, 不主动回复 (微信不允许)
        if (supabaseAdmin) {
          await supabaseAdmin
            .from('users')
            .update({ status: 'deleted', updated_at: new Date().toISOString() })
            .eq('openid', openid);
        }
        return buildEmptyResponse();

      case 'click':
        // 菜单点击 (CLICK 类型)
        await recordUserInteractionSafe(openid, { menuKey: msg.eventKey });
        return handleMenuClick(msg, msg.eventKey || '');

      case 'view':
        // 菜单跳转 (VIEW 类型), 微信不回调到此, 忽略
        return buildEmptyResponse();

      default:
        return buildEmptyResponse();
    }
  }

  // ----- 文本消息 (关键词) -----
  if (msg.msgType === 'text') {
    await recordUserInteractionSafe(openid, { menuKey: 'text_msg' });
    return handleTextContent(msg, msg.content.trim());
  }

  // ----- 其他消息类型 (image/voice/video/location/link), 简单回复 -----
  return buildTextReply(
    msg,
    '收到您的消息,客服小助手正在路上。\n回复【订单】/【价格】/【备案】获取快捷帮助'
  );
}

// ============================================================================
// 关键词 / 菜单处理
// ============================================================================

function handleTextContent(msg: WeChatRecvMessage, content: string): string {
  const lower = content.toLowerCase();

  if (lower.includes('订单') || lower.includes('order')) {
    return buildTextReply(
      msg,
      '查询订单请点菜单: 我的账户 → 我的订单\n' +
      `或直接访问: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://h5.aiwill-planner.cn'}/orders`
    );
  }
  if (lower.includes('价格') || lower.includes('price') || lower.includes('多少钱')) {
    return buildNewsReply(msg, [
      {
        title: '查看完整价格与服务对比',
        description: '系统化生成版 ¥19.9 / 专业资产规划人员护航版 ¥999 / 家庭年度版 ¥4699',
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://h5.aiwill-planner.cn'}/pricing`,
      },
    ]);
  }
  if (lower.includes('备案') || lower.includes('beian') || lower.includes('icp')) {
    return buildTextReply(
      msg,
      '沪ICP备2026020925号-1\n备案查询: https://beian.miit.gov.cn'
    );
  }
  if (lower.includes('帮助') || lower.includes('help') || lower.includes('菜单')) {
    return buildTextReply(msg, getHelpText());
  }
  if (lower.includes('人工') || lower.includes('客服') || lower.includes('kefu')) {
    return buildTextReply(
      msg,
      '工作时间 9:00-21:00,客服微信号: aiwill-cs\n紧急问题请邮件至 support@aiwill-planner.cn'
    );
  }
  if (lower.includes('绑定') || lower.includes('bind')) {
    return buildTextReply(
      msg,
      '绑定账号: 公众号菜单 → 我的账户 → 账号绑定'
    );
  }

  return buildTextReply(
    msg,
    '抱歉,小助手还在学习中~ 您可以试试:【订单】【价格】【备案】【帮助】'
  );
}

function handleMenuClick(msg: WeChatRecvMessage, key: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://h5.aiwill-planner.cn';

  switch (key) {
    // 当前 menu-config.ts 在用 (V1001_* 是微信官方示例命名)
    case 'V1001_HUMAN_SERVICE':
      return buildTextReply(
        msg,
        '工作时间 9:00-21:00,客服微信号: aiwill-cs\n' +
        '紧急问题请邮件至 support@aiwill-planner.cn\n' +
        '回复【订单】查询订单 / 回复【绑定】绑定账号'
      );
    case 'V1001_BEIAN':
      return buildTextReply(
        msg,
        '沪ICP备2026020925号-1\n备案查询: https://beian.miit.gov.cn'
      );

    // 保留旧 key 兼容 (如未来菜单换名)
    case 'MENU_CS_CHAT':
      return buildTextReply(
        msg,
        '客服对话已开启 (48h 内可主动回复您)\n' +
        '回复【订单】查询订单\n回复【人工】转人工客服'
      );
    case 'MENU_BIND_HELP':
      return buildTextReply(msg, `前往绑定: ${baseUrl}/wechat/bind`);

    default:
      return buildTextReply(msg, `收到菜单: ${key}`);
  }
}

// ============================================================================
// 文案常量
// ============================================================================

function getWelcomeText(): string {
  return [
    '欢迎关注 aiwill-planner 智能遗嘱助手 👋',
    '',
    '我们提供基于专业模板的智能遗嘱文书生成服务, 非法律咨询。',
    '',
    '📌 推荐菜单',
    '👉 立即体验 → 制作我的遗嘱',
    '👉 我的账户 → 账号绑定',
    '',
    '📋 备案信息',
    '沪ICP备2026020925号-1',
    '本服务由 aiwill-planner 提供',
  ].join('\n');
}

function getHelpText(): string {
  return [
    '使用帮助:',
    '',
    '🔹【订单】查询我的订单',
    '🔹【价格】查看服务价格',
    '🔹【备案】查看 ICP 备案信息',
    '🔹【绑定】绑定公众号到网站账号',
    '🔹【人工】联系人工客服 (9:00-21:00)',
  ].join('\n');
}

// ============================================================================
// Utils
// ============================================================================

async function recordUserInteractionSafe(openid: string, opts: { menuKey?: string }) {
  try {
    await recordUserInteraction({ openid, menuKey: opts.menuKey });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('recordUserInteraction failed:', message);
    // 不阻断主流程
  }
}
