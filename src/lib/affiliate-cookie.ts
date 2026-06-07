/**
 * 推广码 ref_code cookie 辅助函数.
 *
 * 工作流:
 *  1. 用户访问 https://aiwill-planner.cn/?ref=BX7K2QM
 *  2. middleware 验证 ref_code 存在且 blogger.status='approved'
 *  3. middleware 写入 HTTP-only cookie (maxAge 30 天)
 *  4. 用户下单 (order.paid) 时, createCommissionForOrder() 从 cookie 读 ref_code
 *  5. 写入 commissions 表
 *  6. 30 天后 cookie 过期, 博主无法再通过该访问归因
 *
 * 安全要点:
 *  - HTTP-only: 阻止 XSS 窃取
 *  - sameSite=lax: 防 CSRF
 *  - maxAge 30 天: 防过期 cookie 误归因
 *  - 仅在 middleware 写入, 不在客户端 API 写 (防恶意注入)
 */
import { cookies } from 'next/headers';

export const AFF_REF_COOKIE = 'aff_ref';

export async function getRefFromCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(AFF_REF_COOKIE)?.value ?? null;
}

export async function setRefCookie(refCode: string): Promise<void> {
  const store = await cookies();
  store.set(AFF_REF_COOKIE, refCode, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 天
    path: '/',
  });
}

export async function clearRefCookie(): Promise<void> {
  const store = await cookies();
  store.delete(AFF_REF_COOKIE);
}
