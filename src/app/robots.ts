import type { MetadataRoute } from 'next';

/**
 * Dynamic robots.ts (Next.js 16 App Router).
 * 改版 v7 (2026-06-19): 与 public/robots.txt 静态版保持同步.
 *  - 显式 allow LLM crawlers (GPTBot / Claude / Perplexity / Google-Extended)
 *  - 显式 allow 中文搜索引擎 (百度 / 360 / 搜狗)
 *  - disallow 隐私/管理/支付/订单 路径
 *  - 同时声明 h5 子域 + 主站 sitemap
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://aiwill-planner.cn';
  const h5BaseUrl = 'https://h5.aiwill-planner.cn';

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
        userAgent: ['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'GoogleOther', 'CCBot', 'Applebot-Extended', 'Meta-ExternalAgent', 'DeepSeekBot', 'TongyiCrawler', 'WenxinCrawler', 'MSNBot-Media', 'BingPreview'],
        allow: '/',
      },
      {
        userAgent: ['Baiduspider', 'Baiduspider-image', '360Spider', 'Sogou web spider', 'Sogou Pic Spider', 'YisouSpider', 'ByteSpider'],
        allow: '/',
        crawlDelay: 1,
      },
    ],
    sitemap: [`${baseUrl}/sitemap.xml`, `${h5BaseUrl}/sitemap-h5.xml`],
    host: baseUrl,
  };
}
