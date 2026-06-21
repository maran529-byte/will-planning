import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

/**
 * Dynamic sitemap.ts (Next.js 16 App Router).
 *
 * 改版 v8 (2026-06-21): 拆分 PC / H5 双 sitemap, 解决百度"索引型 sitemap 误判"
 *  - 触发原因: 旧版 sitemap.xml 在 H5 域下同时包含 PC + H5 URL, 百度把
 *              `<loc>` 跨域识别为索引型, 触发"请勿提交索引型 sitemap"错误
 *  - 修复: 通过 headers() 读取 nginx 转发的 Host header 决定输出
 *    - H5 请求 → 仅含 h5.aiwill-planner.cn URL
 *    - PC 请求 → 仅含 aiwill-planner.cn URL
 *
 * 部署约定:
 *  - nginx 把 PC 和 H5 都代理到本地 Next.js (127.0.0.1:3001)
 *  - nginx 在转发时保留原始 Host header
 */
const PC_BASE = 'https://aiwill-planner.cn';
const H5_BASE = 'https://h5.aiwill-planner.cn';
const LAST_MOD = new Date('2026-06-21');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  const host = h.get('host') || '';
  const isH5 = host.startsWith('h5.');
  const BASE = isH5 ? H5_BASE : PC_BASE;
  const SITE = isH5 ? 'h5' : 'pc';

  const path = (
    p: string,
    priority: number,
    freq: 'weekly' | 'monthly' | 'daily' | 'yearly' = 'weekly',
  ): MetadataRoute.Sitemap[number] => ({
    url: `${BASE}${p}`,
    lastModified: LAST_MOD,
    changeFrequency: freq,
    priority,
  });

  if (SITE === 'pc') {
    return [
      path('/', 1.0, 'weekly'),
      path('/doc-type', 0.9, 'weekly'),
      path('/questionnaire', 0.9, 'weekly'),
      path('/faq', 0.8, 'weekly'),
      path('/tutorial', 0.8, 'weekly'),
      path('/compare', 0.8, 'weekly'),
      path('/tool', 0.8, 'weekly'),
      path('/about', 0.7, 'monthly'),
      path('/affiliate', 0.7, 'monthly'),
      path('/guide', 0.8, 'weekly'),
      path('/guide/pre-marriage', 0.7, 'monthly'),
      path('/guide/during-marriage', 0.7, 'monthly'),
      path('/guide/divorce', 0.7, 'monthly'),
      path('/guide/child-custody', 0.7, 'monthly'),
      path('/guide/gift', 0.7, 'monthly'),
      path('/guide/inheritance', 0.7, 'monthly'),
      path('/login', 0.5, 'yearly'),
      path('/register', 0.5, 'yearly'),
      path('/dashboard', 0.4, 'daily'),
      path('/orders', 0.4, 'daily'),
      path('/payment', 0.4, 'daily'),
      path('/result', 0.4, 'daily'),
      path('/privacy', 0.3, 'yearly'),
      path('/terms', 0.3, 'yearly'),
    ];
  }

  return [
    path('/', 1.0, 'weekly'),
    path('/doc-type', 0.9, 'weekly'),
    path('/questionnaire', 0.9, 'weekly'),
    path('/guide', 0.8, 'weekly'),
    path('/guide/pre-marriage', 0.7, 'monthly'),
    path('/guide/during-marriage', 0.7, 'monthly'),
    path('/guide/divorce', 0.7, 'monthly'),
    path('/guide/child-custody', 0.7, 'monthly'),
    path('/guide/gift', 0.7, 'monthly'),
    path('/guide/inheritance', 0.7, 'monthly'),
    path('/about', 0.7, 'monthly'),
    path('/affiliate', 0.7, 'monthly'),
    path('/login', 0.5, 'yearly'),
    path('/register', 0.5, 'yearly'),
    path('/privacy', 0.3, 'yearly'),
    path('/terms', 0.3, 'yearly'),
  ];
}