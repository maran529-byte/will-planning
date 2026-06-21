import type { MetadataRoute } from 'next';

/**
 * Dynamic sitemap.ts (Next.js 16 App Router).
 *
 * 改版 v8 (2026-06-21): 拆分 PC / H5 双 sitemap, 解决百度"索引型 sitemap 误判"
 *  - 触发原因: 旧版 sitemap.xml 在 H5 域下同时包含 PC + H5 URL, 百度把
 *              `<loc>` 跨域识别为索引型, 触发"请勿提交索引型 sitemap"错误
 *  - 修复: 通过 NEXT_PUBLIC_SITE 环境变量 (pc | h5) 切换, 让两个部署产物
 *          各只暴露自己域名的 URL
 *
 * 环境变量约定:
 *  - H5 (Vercel, 主部署): NEXT_PUBLIC_SITE=h5
 *  - PC (next-on-nginx):   NEXT_PUBLIC_SITE=pc  (留空 = 默认 H5, 兼容旧部署)
 */
const SITE_MODE = (process.env.NEXT_PUBLIC_SITE ?? 'h5') as 'pc' | 'h5';
const PC_BASE = 'https://aiwill-planner.cn';
const H5_BASE = 'https://h5.aiwill-planner.cn';
const BASE = SITE_MODE === 'pc' ? PC_BASE : H5_BASE;
const LAST_MOD = new Date('2026-06-21');

export default function sitemap(): MetadataRoute.Sitemap {
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

  if (SITE_MODE === 'pc') {
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