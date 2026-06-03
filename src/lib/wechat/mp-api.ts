/**
 * 微信公众号 通用 API 封装
 * @see https://developers.weixin.qq.com/doc/offiaccount/Publish/Publish_menu/Publish_menu_add_conditional.html
 *
 * 包含:
 *   - access_token 自动刷新 (2000 次/天 限制)
 *   - 自定义菜单管理
 *   - 客服消息发送 (48h 窗口)
 *   - 用户管理 (拉单个用户, 拉关注者列表)
 */

import { WECHAT_MP_APP_ID, WECHAT_MP_APP_SECRET, WECHAT_API_BASE } from './config';
import { supabaseAdmin } from '../supabase-server';

// ============================================================================
// Types
// ============================================================================

interface MpAccessToken {
  access_token: string;
  expires_in: number;        // 秒
  expires_at: number;        // 时间戳 (ms)
  fetched_at: number;
}

interface MpErrorResponse {
  errcode: number;
  errmsg: string;
}

export type MenuButton =
  | { type: 'click'; name: string; key: string }
  | { type: 'view'; name: string; url: string }
  | { type: 'miniprogram'; name: string; url: string; appid: string; pagepath: string }
  | { type: 'view_limited'; name: string; media_id: string };

export interface MenuConfig {
  button: Array<MenuButton | { name: string; sub_button: MenuButton[] }>;
}

export interface CustomerServiceTextMessage {
  msgtype: 'text';
  text: { content: string };
}

export type CustomerServiceMessage = CustomerServiceTextMessage;

// ============================================================================
// access_token 缓存
// ============================================================================

/**
 * 获取公众号 access_token, 自动缓存到内存 + Supabase
 * 限制: 2000 次/天, 每次有效 7200 秒
 */
let cachedToken: MpAccessToken | null = null;
let pendingFetch: Promise<string> | null = null;

export async function getMpAccessToken(): Promise<string> {
  // 1. 内存缓存
  if (cachedToken && cachedToken.expires_at > Date.now() + 60_000) {
    return cachedToken.access_token;
  }

  // 2. 并发去重 (防止同时多个请求)
  if (pendingFetch) {
    return pendingFetch;
  }

  pendingFetch = (async () => {
    try {
      // 3. Supabase 持久化缓存 (跨冷启动)
      if (supabaseAdmin) {
        const { data } = await supabaseAdmin
          .from('app_secrets')
          .select('value, expires_at')
          .eq('key', 'mp_access_token')
          .single();
        if (data?.value && new Date(data.expires_at).getTime() > Date.now() + 60_000) {
          cachedToken = {
            access_token: data.value,
            expires_in: Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000),
            expires_at: new Date(data.expires_at).getTime(),
            fetched_at: Date.now(),
          };
          return cachedToken.access_token;
        }
      }

      // 4. 调微信接口
      const url = new URL(`${WECHAT_API_BASE}/cgi-bin/token`);
      url.searchParams.set('grant_type', 'client_credential');
      url.searchParams.set('appid', WECHAT_MP_APP_ID);
      url.searchParams.set('secret', WECHAT_MP_APP_SECRET);

      const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`getMpAccessToken HTTP ${res.status}`);
      }
      const data = (await res.json()) as MpAccessToken & MpErrorResponse;
      if (data.errcode && data.errcode !== 0) {
        throw new Error(`getMpAccessToken failed: ${data.errcode} ${data.errmsg}`);
      }

      const expiresAt = Date.now() + data.expires_in * 1000;
      cachedToken = {
        access_token: data.access_token,
        expires_in: data.expires_in,
        expires_at: expiresAt,
        fetched_at: Date.now(),
      };

      // 持久化
      if (supabaseAdmin) {
        await supabaseAdmin.from('app_secrets').upsert({
          key: 'mp_access_token',
          value: data.access_token,
          expires_at: new Date(expiresAt).toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      return data.access_token;
    } finally {
      pendingFetch = null;
    }
  })();

  return pendingFetch;
}

// ============================================================================
// 菜单管理
// ============================================================================

/**
 * 创建/覆盖自定义菜单
 * @see https://developers.weixin.qq.com/doc/offiaccount/Custom_Menus/Creating_Custom-Defined_Menu.html
 */
export async function createMenu(menu: MenuConfig): Promise<void> {
  const token = await getMpAccessToken();
  const res = await fetch(`${WECHAT_API_BASE}/cgi-bin/menu/create?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(menu),
  });
  const data = (await res.json()) as MpErrorResponse;
  if (data.errcode && data.errcode !== 0) {
    throw new Error(`createMenu failed: ${data.errcode} ${data.errmsg}`);
  }
}

/**
 * 删除自定义菜单
 */
export async function deleteMenu(): Promise<void> {
  const token = await getMpAccessToken();
  const res = await fetch(`${WECHAT_API_BASE}/cgi-bin/menu/delete?access_token=${token}`, {
    method: 'GET',
  });
  const data = (await res.json()) as MpErrorResponse;
  if (data.errcode && data.errcode !== 0) {
    throw new Error(`deleteMenu failed: ${data.errcode} ${data.errmsg}`);
  }
}

// ============================================================================
// 客服消息
// ============================================================================

/**
 * 发送客服消息 (48h 窗口)
 * @see https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Service_Center_messages.html
 */
export async function sendCustomerServiceMessage(
  openid: string,
  message: CustomerServiceMessage
): Promise<{ ok: boolean; errcode?: number; errmsg?: string }> {
  const token = await getMpAccessToken();
  const res = await fetch(
    `${WECHAT_API_BASE}/cgi-bin/message/custom/send?access_token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ touser: openid, ...message }),
    }
  );
  const data = (await res.json()) as MpErrorResponse;
  if (data.errcode && data.errcode !== 0) {
    return { ok: false, errcode: data.errcode, errmsg: data.errmsg };
  }
  return { ok: true };
}

// ============================================================================
// 用户管理
// ============================================================================

export interface FollowerInfo {
  subscribe: 0 | 1;
  openid: string;
  nickname: string;
  sex: 0 | 1 | 2;
  city: string;
  country: string;
  province: string;
  language: string;
  headimgurl: string;
  subscribe_time: number;
  unionid?: string;
  remark?: string;
  groupid?: number;
  tagid_list?: number[];
}

/**
 * 拉取关注者信息
 * @see https://developers.weixin.qq.com/doc/offiaccount/User_Management/Get_users_basic_information.html
 */
export async function getFollowerInfo(openid: string, lang: 'zh_CN' | 'zh_TW' | 'en' = 'zh_CN'): Promise<FollowerInfo> {
  const token = await getMpAccessToken();
  const url = new URL(`${WECHAT_API_BASE}/cgi-bin/user/info`);
  url.searchParams.set('access_token', token);
  url.searchParams.set('openid', openid);
  url.searchParams.set('lang', lang);

  const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`getFollowerInfo HTTP ${res.status}`);
  }
  return res.json() as Promise<FollowerInfo>;
}
