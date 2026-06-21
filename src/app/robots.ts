import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

/**
 * Dynamic robots.ts (Next.js 16 App Router).
 *
 * 改版 v8 (2026-06-21): 根据请求 Host 输出对应域 sitemap, 避免跨域声明触发
 * 百度索引型误判. 之前两个域都返回一样的 robots.txt 同时声明两个 sitemap,
 * 百度 spider 在抓 h5 时把 aiwill 的 sitemap 当成跨域索引型.
 *
 *  - h5.aiwill-planner.cn → 只声明 h5 sitemap
 *  - aiwill-planner.cn    → 只声明 PC sitemap
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const host = h.get('host') || '';
  const isH5 = host.startsWith('h5.');
  const baseUrl = isH5 ? 'https://h5.aiwill-planner.cn' : 'https://aiwill-planner.cn';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/dashboard',
          '/account',
          '/orders',
          '/result',
          '/payment',
          '/login',
          '/register',
          '/wechat/',
          '/affiliate/dashboard',
          '/affiliate/poster',
        ],
      },
      {
        userAgent: [
          'GPTBot', 'OAI-SearchBot',
          'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
          'PerplexityBot', 'Perplexity-User',
          'Google-Extended', 'GoogleOther',
          'CCBot', 'Applebot-Extended', 'Meta-ExternalAgent',
          'DeepSeekBot', 'TongyiCrawler', 'WenxinCrawler',
          'MSNBot-Media', 'BingPreview',
        ],
        allow: '/',
      },
      {
        userAgent: [
          'Baiduspider', 'Baiduspider-image',
          '360Spider', 'Sogou web spider', 'Sogou Pic Spider',
          'YisouSpider', 'ByteSpider',
        ],
        allow: '/',
        crawlDelay: 1,
      },
    ],
    sitemap: [`${baseUrl}/sitemap.xml`],
    host: baseUrl,
  };
}