/**
 * 公众号 48h 客服消息窗口管理
 *
 * 个人订阅号限制:
 *   - 只能在与用户互动 48h 内发 1 条客服消息
 *   - 无模板消息 (必须用户先互动)
 *
 * 数据存储在 Supabase public.wechat_cs_sessions 表
 */

import { supabaseAdmin } from '../supabase-server';
import { CS_MESSAGE_WINDOW_HOURS } from './config';
import { sendCustomerServiceMessage, CustomerServiceMessage } from './mp-api';

// ============================================================================
// Types
// ============================================================================

export interface CsSession {
  openid: string;
  last_user_msg_at: string;
  last_bot_msg_at: string | null;
  last_menu_key: string | null;
  msg_count: number;
  context: Record<string, unknown>;
}

// ============================================================================
// 窗口检查
// ============================================================================

/**
 * 检查 48h 窗口是否开启
 * @returns true 可发, false 已过期
 */
export async function canSendCsMessage(openid: string): Promise<boolean> {
  if (!supabaseAdmin) {
    throw new Error('supabaseAdmin 未配置, 无法检查 48h 窗口');
  }

  const { data } = await supabaseAdmin
    .from('wechat_cs_sessions')
    .select('last_user_msg_at')
    .eq('openid', openid)
    .single();

  if (!data?.last_user_msg_at) {
    return false;
  }

  const elapsedSec = (Date.now() - new Date(data.last_user_msg_at).getTime()) / 1000;
  return elapsedSec < CS_MESSAGE_WINDOW_HOURS * 3600;
}

/**
 * 获取会话上下文
 */
export async function getCsSession(openid: string): Promise<CsSession | null> {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin
    .from('wechat_cs_sessions')
    .select('*')
    .eq('openid', openid)
    .single();
  return data as CsSession | null;
}

/**
 * 记录用户互动 (开启 48h 窗口)
 * 应在收到用户消息 / 菜单点击时调用
 */
export async function recordUserInteraction(opts: {
  openid: string;
  menuKey?: string;
  contextPatch?: Record<string, unknown>;
}): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('supabaseAdmin 未配置');
  }

  const existing = await getCsSession(opts.openid);
  const newContext = {
    ...(existing?.context || {}),
    ...(opts.contextPatch || {}),
  };

  await supabaseAdmin.from('wechat_cs_sessions').upsert(
    {
      openid: opts.openid,
      last_user_msg_at: new Date().toISOString(),
      last_menu_key: opts.menuKey || existing?.last_menu_key || null,
      msg_count: (existing?.msg_count || 0) + 1,
      context: newContext,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'openid' }
  );
}

// ============================================================================
// 安全发送
// ============================================================================

export interface SafeSendResult {
  sent: boolean;
  reason?: 'window_expired' | 'rate_limited' | 'mp_error' | 'success';
  detail?: string;
}

/**
 * 发送客服消息, 自动检查 48h 窗口
 * @returns 发送结果
 */
export async function safeSendCsMessage(
  openid: string,
  message: CustomerServiceMessage
): Promise<SafeSendResult> {
  // 1. 检查窗口
  const canSend = await canSendCsMessage(openid);
  if (!canSend) {
    return {
      sent: false,
      reason: 'window_expired',
      detail: `用户 ${openid} 已超过 ${CS_MESSAGE_WINDOW_HOURS}h 未互动`,
    };
  }

  // 2. 发送
  const result = await sendCustomerServiceMessage(openid, message);
  if (!result.ok) {
    return {
      sent: false,
      reason: 'mp_error',
      detail: `${result.errcode} ${result.errmsg}`,
    };
  }

  // 3. 更新最后发送时间
  if (supabaseAdmin) {
    await supabaseAdmin
      .from('wechat_cs_sessions')
      .update({ last_bot_msg_at: new Date().toISOString() })
      .eq('openid', openid);
  }

  return { sent: true, reason: 'success' };
}
