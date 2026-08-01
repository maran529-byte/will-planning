import { supabaseAdmin } from "./supabase-server";

/**
 * getSupabaseUserIdFromOpenid
 *
 * 通过 openid (来自 wx_openid cookie) 解析出 supabase auth.uid().
 *
 * 策略: 查 users 表的 openid 列 (UNIQUE) → 直接拿 id
 *   - 兜底: user_wallets.user_id (理论上不会命中, 因为钱包是 openid 注册后才有的)
 *
 * 返回 null 表示该 openid 还没有绑定 user (游客).
 */

const cache = new Map<string, { userId: string; ts: number }>();
const CACHE_TTL = 60_000; // 60s

export async function getSupabaseUserIdFromOpenid(openid: string): Promise<string | null> {
  if (!openid || !supabaseAdmin) return null;

  // cache
  const cached = cache.get(openid);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.userId;
  }

  // 1. 主路径: users.openid
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("openid", openid)
    .maybeSingle();

  const userId = user?.id ?? null;
  if (userId) {
    cache.set(openid, { userId, ts: Date.now() });
  }
  return userId;
}

export function clearUserMappingCache() {
  cache.clear();
}
