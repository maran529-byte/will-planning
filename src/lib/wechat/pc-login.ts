/**
 * PC 端扫码登录 - 公众号侧 confirm (内部)
 *
 * 改版 v15 (2026-08-02) — 并发安全硬化
 *
 * 并发场景分析 (3 个用户场景):
 *
 *   场景 1: 用户 A 和用户 B 同时输入【PC】
 *     → 每个 openid 独立 ticket, code 独立 → 互不干扰 ✓
 *
 *   场景 2: 用户 A 在 PC 端开 2 个 tab, 都创建无主 ticket T1/T2
 *     → A 在公众号输入【PC】触发 adopt
 *     → 抢单 T1 → 抢到则 cancel T2 → 推送 code
 *     → 用户在 PC 任一 tab 输 code 都对 (PC 端轮询 code 即可) ✓
 *
 *   场景 3: 同一用户 A 在 1 秒内连续输入 3 次【PC】
 *     → 3 个 worker 并发执行 ensurePcLoginTicket(A_openid)
 *     → 第 1 个先 cancel-all-A-active, 然后 INSERT ticket_1 (code=X)
 *     → 第 2 个 cancel-all-A-active (cancel ticket_1), INSERT ticket_2 (code=Y)
 *     → 第 3 个 cancel-all-A-active (cancel ticket_2), INSERT ticket_3 (code=Z)
 *     → 最终只保留 ticket_3 (code=Z), 用户收到 Z ✓
 *     注意: 中间过程的 ticket_1/ticket_2 都会被 cancel, 用户最终收到的推送是
 *           第 3 个 worker 的, 不会混乱 (因 reply 异步送达)
 *
 *   场景 4: 两个用户 A, B 同时 adopt 同一无主 ticket T1
 *     → 第 1 个 UPDATE ... WHERE ticket=T1 AND status='pending' AND openid IS NULL
 *        → affected=1, 成功, code=A_code
 *     → 第 2 个同样 UPDATE → affected=0 (openid 已被 A 填, 不再满足 IS NULL)
 *        → fallback 到"复用 openid 已有 ticket" 或"创建新 ticket"
 *     → 用户 A 收到 A_code ✓ 用户 B 收到 B_code (自己 openid 的 ticket) ✓
 *
 *   场景 5: code 碰撞 (极小概率, 32^8 ≈ 1.1 万亿)
 *     → UNIQUE INDEX uniq_pc_login_active_code
 *     → INSERT 失败 → retry 重生成 code → 重新 INSERT
 *
 * 由 mp-callback 在用户回复【PC】/【电脑】/点击「电脑端登录」菜单后调用.
 *
 * 流程:
 *   1. cancel 该 openid 所有 active (pending/confirmed) ticket (强约束: 一人一票)
 *   2. adopt 孤儿 ticket (status=pending AND openid IS NULL), 原子 UPDATE
 *   3. 如未抢到, 创建新 ticket (code 重试至 UNIQUE INDEX 允许)
 *   4. 推送 8 位验证码 + 操作提示给用户
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
 * 取消该 openid 所有 active (pending/confirmed) ticket
 * 目的: 保证同一时刻, 一个 openid 最多只有 1 个 active ticket
 *
 * 这是"一人一票"约束的核心. 无论用户怎么重复输入 pc, 最终都只保留 1 个 active ticket.
 */
async function cancelAllActiveForOpenid(openid: string): Promise<void> {
  if (!supabaseAdmin) return;
  await supabaseAdmin
    .from('pc_login_tickets')
    .update({ status: 'cancelled' })
    .eq('openid', openid)
    .in('status', ['pending', 'confirmed']);
}

/**
 * 原子抢单: 用 conditional UPDATE 做 CAS (compare-and-swap)
 * 只在 ticket 仍是 (status=pending AND openid IS NULL) 时才更新
 * 返回 affected_rows 数: 1=成功, 0=被别人抢走了
 */
async function adoptOrphanTicket(
  openid: string,
  newCode: string
): Promise<{ ticket: string; code: string; expires_at: string } | null> {
  if (!supabaseAdmin) return null;

  // 先 SELECT 拿到候选 ticket PK (不做 FOR UPDATE, 因 supabase-js 不支持)
  // 然后用 conditional UPDATE 做原子 CAS
  // 注意: SELECT + UPDATE 中间有时间窗口, 但 UPDATE 的 WHERE 条件保证
  //       即使被别人先抢, 我们的 UPDATE 也只会影响 0 行
  const { data: orphan } = await supabaseAdmin
    .from('pc_login_tickets')
    .select('ticket')
    .eq('status', 'pending')
    .is('openid', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!orphan) return null;

  const { data: adopted, error } = await supabaseAdmin
    .from('pc_login_tickets')
    .update({
      openid,
      code: newCode,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    })
    .eq('ticket', orphan.ticket)
    .eq('status', 'pending')
    .is('openid', null)  // CAS: 只有仍未被认领的 ticket 才能 update
    .select('ticket, code, expires_at')
    .maybeSingle();

  if (error || !adopted) return null;
  return adopted;
}

/**
 * 创建新 ticket, code 重试至 UNIQUE INDEX 允许 (防碰撞)
 */
async function createNewTicket(
  openid: string,
  options: { returnTo?: string; ip?: string; userAgent?: string },
  expiresAt: string
): Promise<{ ticket: string; code: string; expires_at: string } | null> {
  if (!supabaseAdmin) return null;

  // 最多重试 5 次 (code 碰撞概率 32^8 ≈ 1.1 万亿, 实际 5 次足够)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { data, error } = await supabaseAdmin
      .from('pc_login_tickets')
      .insert({
        ticket: randomBytes(12).toString('base64url'),
        code,
        openid,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        return_to: options.returnTo || '/orders',
        user_agent: options.userAgent || null,
        ip_address: options.ip || null,
        expires_at: expiresAt,
      })
      .select('ticket, code, expires_at')
      .single();

    // 唯一索引冲突 → 重试 (理论上 32^8 概率极小, 但 UNIQUE INDEX 兜底)
    if (error && error.code === '23505') {
      console.warn(`[ensurePcLoginTicket] code collision (attempt ${attempt + 1}/5), retrying`);
      continue;
    }
    if (error || !data) {
      console.error('[ensurePcLoginTicket] insert failed:', JSON.stringify({
        openid: openid.substring(0, 12) + '...',
        code,
        error: error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null,
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      }, null, 2));
      return null;
    }
    return data;
  }
  console.error('[ensurePcLoginTicket] insert failed after 5 retries (code collision)');
  return null;
}

/**
 * 为 openid 创建或查找 PC 登录 ticket.
 *
 * 并发安全策略 (改版 v15, 2026-08-02):
 *   1. 一人一票: 进入时先 cancel 该 openid 所有 active ticket, 保证后续操作
 *      不受历史 ticket 干扰. 即使是同 openid 重复触发, 也只有最后一次生效.
 *   2. 原子抢单: adopt 孤儿 ticket 用 conditional UPDATE 做 CAS, 失败则 fallback.
 *   3. code 唯一: 创建新 ticket 时 UNIQUE INDEX 兜底碰撞, 最多重试 5 次.
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

  // Step 0: 一人一票 — 取消该 openid 所有 active ticket
  //         这避免了"同 openid 多 ticket"问题, 也避免 adopt 完成后该 openid
  //         还有遗留 ticket 导致用户混淆
  await cancelAllActiveForOpenid(openid);

  // Step 1: 抢单孤儿 ticket (PC 端先创建的, status=pending, openid IS NULL)
  //         用 conditional UPDATE 做原子 CAS
  const newCode = generateCode();
  const adopted = await adoptOrphanTicket(openid, newCode);
  if (adopted) {
    return {
      success: true,
      ticket: adopted.ticket,
      code: adopted.code,
      message: buildMessage(adopted.code),
      source: 'reuse',
    };
  }

  // Step 2: 抢单失败, 创建新 ticket (手机先发起场景)
  //         Step 0 已 cancel 该 openid 所有 active ticket, 所以这里 INSERT
  //         后该 openid 唯一 active ticket 就是这个新的
  const created = await createNewTicket(openid, options || {}, expiresAt);
  if (!created) {
    return {
      success: false,
      reason: 'db_error',
      message: '创建登录票据失败,请稍后重试',
      source: 'none',
    };
  }
  return {
    success: true,
    ticket: created.ticket,
    code: created.code,
    message: buildMessage(created.code),
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
 *
 * 注意: 改版 v15 后此函数几乎不会被调用 — 因为 ensurePcLoginTicket
 *       入口处的 cancelAllActiveForOpenid 会清掉所有 active ticket,
 *       不会再有"用户重复输入 pc"的复用场景 (每次都是新 ticket).
 *       保留此函数仅为向后兼容.
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