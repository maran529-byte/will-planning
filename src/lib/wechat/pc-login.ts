/**
 * PC 端扫码登录 - 公众号侧 confirm (内部)
 *
 * 改版 v13 (2026-06-29)
 *
 * 由 mp-callback 在用户回复【PC】/【电脑】/点击「电脑端登录」菜单后调用.
 *
 * 流程:
 *   1. 查 openid 对应的有效 ticket (status=pending, 未过期, 最新一个)
 *   2. 如果没有: 创建新 ticket (反向流程 - 公众号内触发, PC 端需配合刷新页面)
 *   3. 推送 8 位验证码 + 操作提示给用户
 *
 * 注意: 由于微信公众号「主动给用户发消息」需要客服消息 48h 窗口,
 *       此功能仅在用户最近 48h 内与公众号互动过的情况下可推送文字.
 *       超过 48h 也能创建 ticket, 但用户需要主动在公众号内点菜单或发消息触发.
 */

import { supabaseAdmin } from '@/lib/supabase-server';
import { randomBytes } from 'crypto';

// 生成 8 位大写字母数字验证码 (去掉容易混淆的 0/O/1/I/L)
function generateCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export interface PcLoginConfirmResult {
  success: boolean;
  ticket?: string;
  code?: string;
  reason?: string;
  message: string; // 推送给用户的文字
  source: 'reuse' | 'create' | 'none';
}

/**
 * 为 openid 创建或查找 PC 登录 ticket.
 *
 * 调用场景: 用户在公众号内回复【PC】或点击菜单时
 *
 * 行为 (改版 v13.1, 2026-06-30):
 *   1. 优先复用 openid 已有的 pending ticket
 *   2. 如果没有 openid 的 pending ticket, 查找"PC 端先创建"的无主 ticket (无 openid)
 *      - 找到则用该 ticket 的 code (不变), 填充 openid, 标记 confirmed
 *      - 用户在 PC 端可直接输 T1 的 code (公众号推送里显示)
 *   3. 都没有: 创建新 ticket (手机先发起场景)
 *   - 同时取消该 openid 名下其他 pending ticket (避免一个用户开多个)
 */
export async function ensurePcLoginTicket(
  openid: string,
  options?: { returnTo?: string; ip?: string; userAgent?: string }
): Promise<PcLoginConfirmResult> {
  if (!supabaseAdmin) {
    return {
      success: false,
      reason: 'supabase_not_configured',
      message: '服务暂不可用',
      source: 'none',
    };
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // 1. 优先抢单: 查找"PC 端先创建"的无主 ticket (status=pending, openid IS NULL)
  //    这样 PC 端创建 T1 后, 用户在公众号回复 [PC] 就能立即把 T1 认领,
  //    避免出现 T1 + T 两个独立 ticket 导致 PC 输入的 code 永远不匹配.
  //    注意: PostgREST 在 PATCH 请求中按时间戳列 order by 会报 42703 错误
  //          ("column does not exist"), 必须先用 SELECT 找出 ticket, 再按 ticket PK 更新.
  //    抢单: 用新生成的 code 覆盖 (保证 PC 端看不到旧 code),
  //    填充 openid, 标记 confirmed.
  const newCode = generateCode();
  // Step 1a: SELECT 找到最新的"无主" ticket
  // (PostgREST 在 PATCH 中按时间戳列 order by 会报 42703, 必须用 SELECT + UPDATE 两步)
  const { data: orphan } = await supabaseAdmin
    .from('pc_login_tickets')
    .select('ticket, code, expires_at')
    .eq('status', 'pending')
    .is('openid', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (orphan) {
    // Step 1b: UPDATE 该 ticket (按 ticket PK, 不会触发 order by 错误)
    const { data: adopted, error: adoptError } = await supabaseAdmin
      .from('pc_login_tickets')
      .update({
        openid,
        code: newCode,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('ticket', orphan.ticket)
      .select('ticket, code, expires_at')
      .maybeSingle();

    if (!adoptError && adopted) {
      return {
        success: true,
        ticket: adopted.ticket,
        code: adopted.code,
        message: buildMessage(adopted.code),
        source: 'reuse',
      };
    }
  }

  // 2. 抢单失败, 复用 openid 已有的 pending ticket (例如用户重复回复 [PC])
  const { data: existingForOpenid } = await supabaseAdmin
    .from('pc_login_tickets')
    .select('ticket, code, expires_at')
    .eq('openid', openid)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingForOpenid) {
    return {
      success: true,
      ticket: existingForOpenid.ticket,
      code: existingForOpenid.code,
      message: buildMessage(existingForOpenid.code),
      source: 'reuse',
    };
  }

  // 3. 都没有: 创建新 ticket (手机先发起场景)
  //    此时 status 直接设为 'confirmed' — 公众号侧已确认用户意图, PC 端只需要输验证码
  const code = generateCode();
  const confirmedAt = new Date().toISOString();

  // 取消该 openid 名下其他 pending ticket
  await supabaseAdmin
    .from('pc_login_tickets')
    .update({ status: 'cancelled' })
    .eq('openid', openid)
    .eq('status', 'pending');

  // 插入新 ticket (status=confirmed, 因为 MP 侧已确认)
  const { data, error } = await supabaseAdmin
    .from('pc_login_tickets')
    .insert({
      ticket: randomBytes(12).toString('base64url'),
      code,
      openid,
      status: 'confirmed',
      confirmed_at: confirmedAt,
      return_to: options?.returnTo || '/orders',
      user_agent: options?.userAgent || null,
      ip_address: options?.ip || null,
      expires_at: expiresAt,
    })
    .select('ticket, code, expires_at')
    .single();

  if (error || !data) {
    // 改版 v14 (2026-08-02): 详细日志帮助排查 Vercel/大陆 Supabase URL 不一致问题
    console.error('[ensurePcLoginTicket] insert failed:', JSON.stringify({
      openid: openid.substring(0, 12) + '...',
      code,
      error: error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null,
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabase_internal: process.env.SUPABASE_INTERNAL_URL || '(use NEXT_PUBLIC)',
    }, null, 2));
    return {
      success: false,
      reason: 'db_error',
      message: '创建登录票据失败,请稍后重试',
      source: 'none',
    };
  }

  return {
    success: true,
    ticket: data.ticket,
    code: data.code,
    message: buildMessage(data.code),
    source: 'create',
  };
}

function buildMessage(code: string): string {
  return (
    `🔐 电脑端登录验证码\n\n` +
    `您的验证码是: ${code}\n\n` +
    `📌 操作步骤:\n` +
    `1. 在您电脑浏览器打开 https://aiwill-planner.cn\n` +
    `2. 点击页面右上角「登录」按钮\n` +
    `3. 在弹窗中输入验证码: ${code}\n` +
    `4. 点击「确认登录」即可\n\n` +
    `⏰ 验证码 5 分钟内有效,过期请重新回复【PC】`
  );
}

/**
 * 仅检查 openid 是否有 pending ticket (不创建)
 * 用于用户多次回复【PC】时复用同一验证码
 */
export async function findExistingPcLoginTicket(
  openid: string
): Promise<{ ticket: string; code: string; expiresAt: string } | null> {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from('pc_login_tickets')
    .select('ticket, code, expires_at')
    .eq('openid', openid)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    ticket: data.ticket,
    code: data.code,
    expiresAt: data.expires_at,
  };
}
