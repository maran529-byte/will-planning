/**
 * 公众号服务器回调 (URL 验证 + 消息 / 事件接收)
 * GET  /api/wechat/mp-callback?signature=...&timestamp=...&nonce=...&echostr=...
 *        → 返回 echostr (URL 验证)
 * POST /api/wechat/mp-callback  (XML body)
 *        → 解析消息/事件, 被动回复 (XML)
 *
 * 处理:
 *   - 关注 / 取消关注
 *   - 文本消息 (关键词: help / 价格 / 备案 / 人工 / 订单 / PC)
 *   - 菜单点击 (CLICK)
 *   - 菜单跳转 (VIEW) - 微信不回调, 忽略
 *
 * 改版 v13 (2026-06-29): 新增 PC 端登录 (用户回复【PC】触发)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureSafe } from '@/lib/wechat/verify';
import { parseWeChatXml, buildTextReply, buildNewsReply, buildEmptyResponse, WeChatRecvMessage } from '@/lib/wechat/xml';
import { recordUserInteraction } from '@/lib/wechat/cs-window';
import { assertWeChatMpConfigured, WECHAT_MP_AES_KEY, WECHAT_MP_APP_ID, WECHAT_MP_TOKEN, WECHAT_MP_ENCODING } from '@/lib/wechat/config';
import { createWeChatCrypto, buildEncryptedReply } from '@/lib/wechat/crypto';
import { supabaseAdmin } from '@/lib/supabase-server';
import { ensurePcLoginTicket, findExistingPcLoginTicket } from '@/lib/wechat/pc-login';
import { createHash } from 'crypto';

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

  // 改版 v14 (2026-08-02): try/catch 包 verifySignatureSafe
  // 避免 WECHAT_MP_TOKEN 缺失时 throw → 500 → 微信重试 3 次后丢弃
  let valid: boolean;
  try {
    valid = verifySignatureSafe({ signature, timestamp, nonce });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[mp-callback GET] verifySignatureSafe failed:', message);
    return new NextResponse('verify_error: ' + message, { status: 401 });
  }
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

  // 改版 v14 (2026-08-02): try/catch 包 verifySignatureSafe
  // 避免 WECHAT_MP_TOKEN 缺失时 throw → 500 → 微信重试 3 次后丢弃
  let valid: boolean;
  try {
    valid = verifySignatureSafe({ signature, timestamp, nonce });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[mp-callback POST] verifySignatureSafe failed:', message);
    // 返回 success (200) 让微信停止重试, 但不回复用户
    return new NextResponse(buildEmptyResponse(), {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
  if (!valid) {
    return new NextResponse('invalid signature', { status: 403 });
  }

  const rawXml = await req.text();
  const { searchParams: sp } = req.nextUrl;
  const msgSignature = sp.get('msg_signature');

  // 改版 v14 (2026-08-02): 支持 AES 安全模式 (EncodingAESKey)
  // 微信安全模式下, body 形如: <xml><ToUserName/><Encrypt>...</Encrypt></xml>
  // 需要先 AES 解密才能 parseWeChatXml; 主动回复也要加密
  let xml = rawXml;
  let isAes = false;
  if (/<Encrypt>/i.test(rawXml) && msgSignature && WECHAT_MP_ENCODING === 'aes' && WECHAT_MP_AES_KEY) {
    isAes = true;
    try {
      // 1. 用 msg_signature 校验: sha1(sort([token, timestamp, nonce, encrypt]))
      const m = rawXml.match(/<Encrypt><\!\[CDATA\[([\s\S]+?)\]\]><\/Encrypt>/);
      if (!m) throw new Error('No <Encrypt> tag found in AES body');
      const encryptStr = m[1];
      const ts = sp.get('timestamp') || '';
      const nonce = sp.get('nonce') || '';
      const expectedSig = createHash('sha1')
        .update([WECHAT_MP_TOKEN, ts, nonce, encryptStr].sort().join(''))
        .digest('hex');
      if (expectedSig !== msgSignature) {
        console.error('[mp-callback] msg_signature mismatch (AES)');
        return new NextResponse(buildEmptyResponse(), { status: 200, headers: { 'Content-Type': 'text/plain' } });
      }
      // 2. AES 解密
      const crypto = createWeChatCrypto(WECHAT_MP_AES_KEY, WECHAT_MP_APP_ID);
      xml = crypto.decrypt(encryptStr);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('[mp-callback] AES decrypt failed:', message);
      return new NextResponse(buildEmptyResponse(), { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
  }

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

  // 安全模式: 回复也要加密
  if (isAes && WECHAT_MP_AES_KEY) {
    try {
      const crypto = createWeChatCrypto(WECHAT_MP_AES_KEY, WECHAT_MP_APP_ID);
      const encrypted = crypto.encrypt(reply);
      const ts = String(Math.floor(Date.now() / 1000));
      const nonce = Math.random().toString(36).substring(2, 10);
      const sig = createHash('sha1')
        .update([WECHAT_MP_TOKEN, ts, nonce, encrypted].sort().join(''))
        .digest('hex');
      return new NextResponse(
        buildEncryptedReply(encrypted, sig, ts, nonce),
        { status: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('[mp-callback] AES encrypt reply failed:', message);
      // 加密失败, 返回明文 (微信会忽略, 不影响主流程)
    }
  }

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
        // 关注: 记录 + 欢迎语 (图文 - 6 类文书入口 + PC 登录引导)
        await recordUserInteractionSafe(openid, { menuKey: 'subscribe' });
        // 如果是"带参数二维码"扫码关注 (EventKey 以 qrscene_ 开头),
        // 自动识别意图并推送 PC 登录验证码
        if (msg.eventKey && msg.eventKey.startsWith('qrscene_')) {
          const scene = msg.eventKey.replace(/^qrscene_/, '');
          if (scene.startsWith('pc_login')) {
            // PC 端登录场景: 自动生成/认领 ticket, 直接推 8 位验证码
            return handlePcLoginRequest(msg, openid);
          }
        }
        return buildWelcomeReply(msg);

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
    return handleTextContent(msg, msg.content.trim(), openid);
  }

  // ----- 其他消息类型 (image/voice/video/location/link), 简单回复 -----
  return buildTextReply(
    msg,
    '收到您的消息,客服小助手正在路上。\n回复【订单】/【价格】/【备案】/【PC】获取快捷帮助'
  );
}

// ============================================================================
// 关键词 / 菜单处理
// ============================================================================

async function handleTextContent(msg: WeChatRecvMessage, content: string, openid: string): Promise<string> {
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
        title: '查看完整价格与服务说明',
        description: '智能版 ¥19.9 起 (全站唯一标准产品). 复杂场景 (跨境 / 股权 / 大额资产) 可在 /contact 留言定制服务, 由资产规划专业人士 1 对 1 对接.',
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
      '工作时间 9:00-21:00,公众号「家有所爱」内直接回复消息即可\n紧急问题请邮件至 330320991@qq.com'
    );
  }
  if (lower.includes('绑定') || lower.includes('bind')) {
    return buildTextReply(
      msg,
      '绑定账号: 公众号菜单 → 我的账户 → 账号绑定'
    );
  }

  // 改版 v13: PC 端登录 (用户回复【PC】/【电脑】/【电脑登录】)
  if (
    lower === 'pc' ||
    lower === '电脑' ||
    lower === '登录电脑' ||
    lower.includes('电脑登录') ||
    lower.includes('pc登录') ||
    lower.includes('电脑端')
  ) {
    return handlePcLoginRequest(msg, openid);
  }

  return buildTextReply(
    msg,
    '抱歉,小助手还在学习中~ 您可以试试:【订单】【价格】【备案】【PC】'
  );
}

/**
 * 改版 v13: 处理 PC 端登录请求
 * 用户在公众号内回复【PC】→ 复用或创建 ticket → 推送 8 位验证码
 */
async function handlePcLoginRequest(msg: WeChatRecvMessage, openid: string): Promise<string> {
  const pcUrl = 'https://aiwill-planner.cn';

  // 优先复用未过期的 ticket
  const existing = await findExistingPcLoginTicket(openid);
  if (existing) {
    return buildTextReply(
      msg,
      '🔐 电脑端登录验证码\n\n' +
      '您刚才已请求过验证码,可以直接使用:\n\n' +
      `👉 ${existing.code}\n\n` +
      '📌 操作步骤:\n' +
      `1. 在您电脑浏览器打开 ${pcUrl}\n` +
      '2. 点击页面右上角「登录」按钮\n' +
      `3. 在弹窗中输入验证码: ${existing.code}\n` +
      '4. 点击「确认登录」即可\n\n' +
      '⏰ 验证码将在 5 分钟后过期,过期请重新回复【PC】'
    );
  }

  // 没有 pending ticket, 创建新的
  const result = await ensurePcLoginTicket(openid, { returnTo: '/orders' });
  if (!result.success || !result.code) {
    return buildTextReply(
      msg,
      '❌ 验证码生成失败,请稍后重试\n' +
      '如持续失败,请联系客服: 公众号内回复【人工】'
    );
  }

  return buildTextReply(
    msg,
    '🔐 电脑端登录验证码\n\n' +
    '您的验证码是:\n\n' +
    `👉 ${result.code}\n\n` +
    '📌 操作步骤:\n' +
    `1. 在您电脑浏览器打开 ${pcUrl}\n` +
    '2. 点击页面右上角「登录」按钮\n' +
    `3. 在弹窗中输入验证码: ${result.code}\n` +
    '4. 点击「确认登录」即可\n\n' +
    '⏰ 验证码 5 分钟内有效,过期请重新回复【PC】'
  );
}

async function handleMenuClick(msg: WeChatRecvMessage, key: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://h5.aiwill-planner.cn';

  switch (key) {
    // 当前 menu-config.ts 在用 (V1001_* 是微信官方示例命名)
    case 'V1001_HUMAN_SERVICE':
      return buildTextReply(
        msg,
        '工作时间 9:00-21:00,公众号「家有所爱」内直接回复消息即可\n' +
        '紧急问题请邮件至 330320991@qq.com\n' +
        '回复【订单】查询订单 / 回复【绑定】绑定账号'
      );
    case 'V1001_BEIAN':
      return buildTextReply(
        msg,
        '沪ICP备2026020925号-1\n备案查询: https://beian.miit.gov.cn'
      );

    // 改版 v13: PC 端登录菜单
    case 'V1001_PC_LOGIN':
      return handlePcLoginRequest(msg, msg.fromUserName);

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

/**
 * 关注欢迎语 - 图文消息 (6 类文书入口)
 * 微信限制: 最多 10 条 article, 我们用 6 条 (1 主标题 + 5 子类目入口)
 */
function buildWelcomeReply(msg: WeChatRecvMessage): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://h5.aiwill-planner.cn';
  return buildNewsReply(msg, [
    {
      title: '👋 欢迎关注 家有所爱 — 家庭财产与爱的传承助手',
      description: '🔐 电脑端登录: 在公众号对话框直接回复【PC】即可收到 8 位验证码 · 基于专业模板的智能文书生成服务 (遗嘱/婚内财产/婚前/离婚/抚养/赠与), ¥19.9 起。',
      picUrl: `${baseUrl}/icon-512.png`,
      url: `${baseUrl}/`,
    },
    {
      title: '📜 1. 智能遗嘱 — 我的财产我做主',
      description: '中华遗嘱库对接模板 · 法定/自书/代书/录音/危急 5 种形式 · AI 引导填写, ¥19.9 起',
      picUrl: `${baseUrl}/icon-192.png`,
      url: `${baseUrl}/questionnaire?doc_type=will`,
    },
    {
      title: '💍 2. 婚内财产协议 — 给婚姻加一份安心',
      description: '婚姻关系存续期间财产约定 · 保护个人财产与共同财产 · 一键生成规范文本',
      picUrl: `${baseUrl}/icon-192.png`,
      url: `${baseUrl}/questionnaire?doc_type=marital_property`,
    },
    {
      title: '💑 3. 婚前财产协议 — 理性守护爱情',
      description: '婚前财产清晰约定 · 避免婚后纠纷 · 律师审核模板',
      picUrl: `${baseUrl}/icon-192.png`,
      url: `${baseUrl}/questionnaire?doc_type=marriage`,
    },
    {
      title: '📋 4. 离婚协议书 — 平和分手',
      description: '民政局标准格式 · 财产分割/子女抚养/债务约定 · 离婚冷静期 30 天内可用',
      picUrl: `${baseUrl}/icon-192.png`,
      url: `${baseUrl}/questionnaire?doc_type=divorce`,
    },
    {
      title: '👶 5. 子女抚养协议 — 给孩子的爱不缺席',
      description: '抚养费/探视权/教育规划 · 民法典婚姻家庭编合规 · 法官视角条款设计',
      picUrl: `${baseUrl}/icon-192.png`,
      url: `${baseUrl}/questionnaire?doc_type=child_custody`,
    },
    {
      title: '🎁 6. 赠与协议 — 把爱说在前面',
      description: '动产/不动产/股权赠与 · 公证/非公证双版本 · 撤销权与税费说明',
      picUrl: `${baseUrl}/icon-192.png`,
      url: `${baseUrl}/questionnaire?doc_type=gift`,
    },
  ]);
}

/**
 * 关注欢迎语 - 纯文本版本 (备用, 部分老版本微信不支持 news)
 * 当前默认走图文版 buildWelcomeReply, 此函数保留以备未来切换
 */
function _getWelcomeTextFallback(): string {
  return [
    '👋 欢迎关注 家有所爱 — 家庭财产与爱的传承助手',
    '',
    '我们是基于专业模板的智能文书生成平台, 非法律咨询。',
    '提供 6 类家庭文书在线生成: 遗嘱/婚内财产/婚前/离婚/抚养/赠与, ¥19.9 起。',
    '',
    '📌 三步开启',
    '① 点击下方菜单 【立即体验】→ 选择文书类型',
    '② AI 引导填写, 5-10 分钟完成',
    '③ 在线支付, 立即下载 Word/PDF',
    '',
    '💡 推荐菜单',
    '👉 立即体验 → 制作我的文书',
    '👉 我的账户 → 账号绑定/订单查询',
    '👉 帮助 → 查看使用指南',
    '',
    '⏰ 服务时间: 工作日 9:00-21:00',
    '📧 邮件支持: 330320991@qq.com',
    '',
    '📋 备案: 沪ICP备2026020925号-1',
    '本服务由 家有所爱 提供',
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
    '🔹【PC】电脑端登录 (获取 8 位验证码)',
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
