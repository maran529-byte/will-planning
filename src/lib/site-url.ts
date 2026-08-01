/**
 * 站点 URL helper - 区分主站 vs H5 的 canonical URL.
 *
 * 背景:
 *   - 同一份 Next.js 代码同时服务 aiwill-planner.cn (主站) 和 h5.aiwill-planner.cn (H5)
 *   - 此前所有页面硬编码 canonical 指向主站, 导致 H5 站页面被搜索引擎判定为"镜像"
 *     SEO 权重分散, 收录率低.
 *
 * 用法:
 *   import { getCanonicalUrl, getSiteUrl } from '@/lib/site-url'
 *
 *   // generateMetadata 中:
 *   const url = getCanonicalUrl('/faq')
 *   alternates: { canonical: url }
 *
 *   // 任意位置:
 *   const base = getSiteUrl()  // 'https://aiwill-planner.cn' | 'https://h5.aiwill-planner.cn'
 */

import { headers } from 'next/headers';
import { isH5Host } from './host';

const PC_BASE = 'https://aiwill-planner.cn';
const H5_BASE = 'https://h5.aiwill-planner.cn';

/**
 * 获取当前请求对应的站点基础 URL.
 * 在 SSR 中读取 host header, 在客户端构建时返回主站 (默认).
 */
export async function getSiteUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get('host') || '';
    return isH5Host(host) ? H5_BASE : PC_BASE;
  } catch {
    return PC_BASE;
  }
}

/**
 * 获取指定路径的 canonical URL (async).
 * @param path 以 / 开头的路径, 例如 '/faq'
 */
export async function getCanonicalUrl(path: string): Promise<string> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${await getSiteUrl()}${normalized}`;
}

/**
 * 业务路径(账号/订单/支付)永远指向 H5.
 * 因为业务只能跑在 H5 子域(主站合规红线: 0 form / 0 input).
 */
export function getBusinessUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${H5_BASE}${normalized}`;
}