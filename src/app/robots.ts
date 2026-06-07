import type { MetadataRoute } from 'next';

/**
 * robots.txt
 * - 公开页面: 允许索引
 * - /admin, /api, /account, /affiliate/dashboard: 禁止
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/account', '/affiliate/dashboard', '/payment', '/wechat/'],
      },
      // 百度: 同上 + 明确允许
      {
        userAgent: 'Baiduspider',
        allow: '/',
        disallow: ['/admin/', '/api/', '/account', '/affiliate/dashboard', '/payment', '/wechat/'],
      },
      // 微信爬虫 (用于公众号文章引用)
      {
        userAgent: 'MicroMessenger',
        allow: '/',
        disallow: ['/admin/', '/api/', '/account', '/affiliate/dashboard', '/payment', '/wechat/'],
      },
    ],
    sitemap: 'https://aiwill-planner.cn/sitemap.xml',
    host: 'https://aiwill-planner.cn',
  };
}
