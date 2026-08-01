import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import {
  getAllSlugs,
  getAllCategorySlugs,
  getArticleBySlug,
} from '@/lib/articles';

/**
 * Dynamic sitemap.ts (Next.js 16 App Router).
 *
 * 改版 v8 (2026-06-21): 拆分 PC / H5 双 sitemap, 解决百度"索引型 sitemap 误判"
 * 改版 v9 (2026-06-28): 接入 /knowledge 内容中心, 自动展开所有文章 + 分类页
 * 改版 v10 (2026-07-02): 强制 dynamic, 修复 DYNAMIC_SERVER_USAGE 运行时错误
 *   (sitemap 调用了 headers() 检测 host, 必须运行时渲染)
 */
export const dynamic = 'force-dynamic';

const PC_BASE = 'https://aiwill-planner.cn';
const H5_BASE = 'https://h5.aiwill-planner.cn';
// 改版 v20 (2026-07-10): 动态 lastmod, 用当前生成时间, 百度/Google 看到 sitemap 更新更频繁
const LAST_MOD = new Date();

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

  const categoryEntries = getAllCategorySlugs().map((c) =>
    path(`/knowledge/${c}`, 0.85, 'weekly'),
  );
  const articleEntries = getAllSlugs().map((slug) => {
    const article = getArticleBySlug(slug);
    return path(
      article ? `/knowledge/${article.category}/${slug}` : `/knowledge/${slug}`,
      0.9,
      'weekly',
    );
  });

  if (SITE === 'pc') {
    return [
      path('/', 1.0, 'weekly'),
      path('/knowledge', 0.9, 'weekly'),
      ...categoryEntries,
      ...articleEntries,
      path('/doc-type', 0.9, 'weekly'),
      path('/questionnaire', 0.9, 'weekly'),
      path('/faq', 0.8, 'weekly'),
      path('/compare', 0.8, 'weekly'),
      path('/tool', 0.8, 'weekly'),
      path('/about', 0.7, 'monthly'),
      path('/methodology', 0.6, 'monthly'),
      path('/affiliate', 0.7, 'monthly'),
      path('/guide', 0.3, 'yearly'),
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
    path('/knowledge', 0.9, 'weekly'),
    ...categoryEntries,
    ...articleEntries,
    path('/doc-type', 0.9, 'weekly'),
    path('/questionnaire', 0.9, 'weekly'),
    path('/guide', 0.3, 'yearly'),
    path('/about', 0.7, 'monthly'),
    path('/methodology', 0.6, 'monthly'),
    path('/affiliate', 0.7, 'monthly'),
    // 全球化项目 W1.10: 海外华人专区
    path('/overseas', 0.8, 'weekly'),
    path('/login', 0.5, 'yearly'),
    path('/register', 0.5, 'yearly'),
    path('/privacy', 0.3, 'yearly'),
    path('/terms', 0.3, 'yearly'),
  ];
}
