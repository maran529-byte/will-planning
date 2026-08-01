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
 *
 * 改版 v10 (2026-07-02): 强制 dynamic, 修复 DYNAMIC_SERVER_USAGE 运行时错误
 *   (调用 headers() 检测 host, 必须运行时渲染)
 *
 * 改版 v11 (2026-07-03): LLM crawler 单独 Allow 桌面 "fix-package" (即 / 与
 *   /static-content/), 不再给 User-agent: * 与 LLM/Baidu 整体放开业务路径
 *   Disallow — 此前 LLM 规则用 `allow: '/'` 单独无 disallow, 实际等于允许
 *   GPTBot/ClaudeBot/PerplexityBot 抓取 /dashboard /orders /payment 等业务
 *   路径, 会把 h5 落地页抓进 index. 修复:
 *   1. LLM crawler 同样跟随业务路径 Disallow, 仅额外 Allow 桌面 / 与
 *      /static-content/ 这两个 fix-package 路径
 *   2. Baidu/360 保留 crawlDelay, 但同样不接触业务路径
 *   3. User-agent: * 业务路径 Disallow 维持原样
 */
export const dynamic = 'force-dynamic';

// 业务路径 — 不论哪个 crawler 都禁止抓取 (避免把 h5 落地页 / 用户订单抓进 index)
const BUSINESS_DISALLOW = [
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
];

// LLM crawler 列表 — GPT / Claude / Perplexity / Google-Extended / 国产 LLM
const LLM_USER_AGENTS = [
  'GPTBot', 'OAI-SearchBot',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'GoogleOther',
  'CCBot', 'Applebot-Extended', 'Meta-ExternalAgent',
  'DeepSeekBot', 'TongyiCrawler', 'WenxinCrawler',
  'MSNBot-Media', 'BingPreview',
];

// 国内中文搜索 crawler
const CN_USER_AGENTS = [
  'Baiduspider', 'Baiduspider-image',
  '360Spider', 'Sogou web spider', 'Sogou Pic Spider',
  'YisouSpider', 'ByteSpider',
];

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
        disallow: BUSINESS_DISALLOW,
      },
      {
        // LLM crawler — 仅允许读取桌面"fix-package" (首页 + /static-content/
        // 静态 SEO 落地), 业务路径一律 Disallow. 这样 GPTBot/ClaudeBot
        // 只能读 /knowledge / /faq / /tool / /compare / /static-content
        // 这类公开内容, 不会把 /payment /orders /result 等用户隐私抓走.
        userAgent: LLM_USER_AGENTS,
        allow: ['/', '/static-content/'],
        disallow: BUSINESS_DISALLOW,
      },
      {
        // 国内中文搜索 crawler — crawlDelay 1s 礼貌节流, 业务路径 Disallow
        userAgent: CN_USER_AGENTS,
        allow: '/',
        disallow: BUSINESS_DISALLOW,
        crawlDelay: 1,
      },
    ],
    sitemap: [`${baseUrl}/sitemap.xml`],
    host: baseUrl,
  };
}
