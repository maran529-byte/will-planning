import type { MetadataRoute } from 'next';

/**
 * sitemap.xml
 * - 静态页面: 列出 + changefreq/priority
 * - 动态页面 (暂): 无 (后续博客/律师文章可扩展)
 *
 * 优先级参考:
 *  1.0  首页
 *  0.9  核心转化 (questionnaire, payment)
 *  0.8  重要介绍 (about, terms, privacy)
 *  0.7  增长 (affiliate)
 *  0.5  用户中心 (account, orders)
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://aiwill-planner.cn';
  const now = new Date();

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${base}/questionnaire`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${base}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${base}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${base}/affiliate`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];
}
