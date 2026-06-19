import type { MetadataRoute } from 'next';

/**
 * Dynamic sitemap.ts (Next.js 16 App Router).
 * 改版 v7 (2026-06-19): 与 public/sitemap.xml 静态版保持同步, 但避免人工维护.
 *  - 主站所有公开页面 + 4 个静态合规页 (faq/tutorial/compare/tool)
 *  - H5 子域对应 (mobile alternate)
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://aiwill-planner.cn';
  const h5BaseUrl = 'https://h5.aiwill-planner.cn';
  const now = new Date('2026-06-19');

  const mobileAlternate = (path: string) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: path === '/' ? 1.0 : 0.8,
    alternates: {
      languages: {
        'zh-CN': `${baseUrl}${path}`,
      },
    },
  });

  const h5Path = (path: string) => ({
    url: `${h5BaseUrl}${path}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  });

  return [
    mobileAlternate('/'),
    mobileAlternate('/doc-type'),
    mobileAlternate('/questionnaire'),
    mobileAlternate('/faq'),
    mobileAlternate('/tutorial'),
    mobileAlternate('/compare'),
    mobileAlternate('/tool'),
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/affiliate`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    mobileAlternate('/guide'),
    {
      url: `${baseUrl}/guide/pre-marriage`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/guide/during-marriage`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/guide/divorce`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/guide/child-custody`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/guide/gift`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/guide/inheritance`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/dashboard`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/orders`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/payment`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/result`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    h5Path('/'),
    h5Path('/doc-type'),
    h5Path('/questionnaire'),
    h5Path('/guide'),
    h5Path('/guide/pre-marriage'),
    h5Path('/guide/during-marriage'),
    h5Path('/guide/divorce'),
    h5Path('/guide/child-custody'),
    h5Path('/guide/gift'),
    h5Path('/guide/inheritance'),
    h5Path('/about'),
    h5Path('/affiliate'),
    h5Path('/affiliate/dashboard'),
    h5Path('/affiliate/poster'),
    h5Path('/login'),
    h5Path('/register'),
    h5Path('/privacy'),
    h5Path('/terms'),
  ];
}
