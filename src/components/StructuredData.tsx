/**
 * JSON-LD 结构化数据组件.
 *
 * 业务: 帮搜索引擎 / 微信爬虫 / 百度小程序 / LLM Crawler 理解页面内容.
 * 用法: <StructuredData type="organization" /> 或 <StructuredData type="service" data={...} />
 *
 * 文档:
 *  - Organization: https://schema.org/Organization
 *  - WebSite: https://schema.org/WebSite
 *  - Service: https://schema.org/Service
 *  - FAQPage: https://schema.org/FAQPage
 *  - BreadcrumbList: https://schema.org/BreadcrumbList
 *  - Article (BlogPosting): https://schema.org/BlogPosting
 *  - SpeakableSpecification: https://schema.org/SpeakableSpecification
 */

const BASE_URL = 'https://aiwill-planner.cn';
const ORG_NAME = '家有所爱工作室';
const ORG_NAME_EN = 'aiwill-planner';

interface BaseProps {
  type: 'organization' | 'website' | 'service' | 'faq' | 'breadcrumb' | 'article' | 'speakable';
  data?: Record<string, unknown>;
}

export function StructuredData({ type, data }: BaseProps) {
  let ld: Record<string, unknown> | Record<string, unknown>[];

  switch (type) {
    case 'organization':
      ld = buildOrganization();
      break;
    case 'website':
      ld = buildWebSite();
      break;
    case 'service':
      ld = buildService(data);
      break;
    case 'faq':
      ld = buildFAQ(data);
      break;
    case 'breadcrumb':
      ld = buildBreadcrumb(data);
      break;
    case 'article':
      ld = buildArticle(data);
      break;
    case 'speakable':
      ld = buildSpeakable(data);
      break;
    default:
      return null;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
    />
  );
}

// =============================================================================
// Builder
// =============================================================================

function buildOrganization() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: ORG_NAME,
    alternateName: ORG_NAME_EN,
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description: '面向婚前 / 婚内 / 离婚 / 抚养 / 赠与 5 类家庭场景的智能文书平台, 资产规划专业人士兜底审核',
    foundingDate: '2026-03',
    address: {
      '@type': 'PostalAddress',
      addressRegion: '上海市',
      addressCountry: 'CN',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'hello@aiwill-planner.cn',
      availableLanguage: ['zh-Hans'],
    },
    sameAs: [
      'https://aiwill-planner.cn',
      'https://h5.aiwill-planner.cn',
      // 微信公众号主页 (通用搜索 URL, 微信内可跳转; 公众号无标准 schema URL)
      'https://mp.weixin.qq.com/s/家有所爱',
      // 知乎机构主页 (占位 ID, 后续开通后替换为真实 slug)
      'https://www.zhihu.com/org/aiwill-planner',
      // 小红书企业号 (占位)
      'https://www.xiaohongshu.com/user/aiwill-planner',
      // 官方微博 (占位)
      'https://weibo.com/aiwillplanner',
    ],
  };
}

function buildWebSite() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: ORG_NAME,
    url: BASE_URL,
    inLanguage: 'zh-CN',
    // 注: 当前无 /search 页面, 移除 SearchAction 避免指向 404
    // 未来若开放站内搜索, 在此追加 potentialAction
  };
}

function buildService(data?: Record<string, unknown>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: '系统化家庭文书生成参考',
    provider: {
      '@type': 'Organization',
      name: ORG_NAME,
      url: BASE_URL,
    },
    areaServed: {
      '@type': 'Country',
      name: '中国',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: '套餐',
      itemListElement: [
        {
          '@type': 'Offer',
          name: '智能版',
          description: '系统化生成文书参考, 10 分钟完成',
          price: '19.9',
          priceCurrency: 'CNY',
          availability: 'https://schema.org/InStock',
          url: `${BASE_URL}/payment?plan=ai`,
        },
        // 改版 v3 (2026-07-30): ¥999 专家版已下线, 改为定制服务 (面向复杂场景)
        {
          '@type': 'Offer',
          name: '定制服务',
          description: '跨境 / 股权 / 大额资产 / 再婚多套房产, 资产规划专业人士 1 对 1 对接',
          priceCurrency: 'CNY',
          availability: 'https://schema.org/InStock',
          url: `${BASE_URL}/contact`,
          priceSpecification: {
            '@type': 'PriceSpecification',
            priceCurrency: 'CNY',
            description: '根据场景复杂度单独报价 (在 /contact 留言)',
          },
        },
      ],
    },
    ...(data || {}),
  };
}

function buildFAQ(data?: Record<string, unknown>) {
  // data.faqs: [{ question: string, answer: string }]
  const faqs = (data?.faqs as Array<{ q: string; a: string }>) || [];
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a,
      },
    })),
  };
}

function buildBreadcrumb(data?: Record<string, unknown>) {
  // data.items: [{ name: string, url: string }]
  const items = (data?.items as Array<{ name: string; url: string }>) || [];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url.startsWith('http') ? it.url : `${BASE_URL}${it.url}`,
    })),
  };
}

/**
 * 文章级 Schema (BlogPosting).
 * data: { headline, description, url, image?, datePublished, dateModified,
 *         author?, category?, keywords?, inLanguage? }
 * - author 默认 "家有所爱工作室"
 * - dateModified 缺省回退到 datePublished
 */
function buildArticle(data?: Record<string, unknown>): Record<string, unknown> {
  const d = data || {};
  const url = (d.url as string) || BASE_URL;
  const datePublished = (d.datePublished as string) || new Date().toISOString();
  const dateModified = (d.dateModified as string) || datePublished;
  const author = (d.author as string) || ORG_NAME;
  const reviewedBy = (d.reviewedBy as string) || undefined;
  const sourceCitations = (d.sourceCitations as string[]) || [];
  const result: Record<string, unknown> = {
    '@context': 'https://schema.org',
    // 改版 v3 (2026-07-09): 14 长文页改用 Article, 更精准 (BlogPosting 是较旧类型)
    '@type': 'Article',
    headline: d.headline,
    description: d.description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    image: d.image || [`${BASE_URL}/og-default.png`],
    datePublished,
    dateModified,
    author: {
      '@type': 'Organization',
      name: author,
      url: BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: ORG_NAME,
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo.png` },
    },
    inLanguage: (d.inLanguage as string) || 'zh-CN',
    articleSection: d.category,
    keywords: d.keywords,
    // E-E-A-T: 直接挂 SpeakableSpecification, 帮 LLM/语音助手快速摘要
    speakable: {
      '@type': 'SpeakableSpecification',
      xpath: [
        '/html/head/title',
        '/html/body//h1',
        '/html/body//article/p[1]',
      ],
    },
  };
  // 改版 v10 (2026-06-29): 加入 reviewedBy + citation 字段, 强化 E-E-A-T (经验/专业/权威/信任)
  // Schema.org Person (reviewedBy) 和 CreativeWork (citation) 都有官方支持
  if (reviewedBy) {
    result.reviewedBy = {
      '@type': 'Person',
      name: reviewedBy,
    };
  }
  if (sourceCitations.length > 0) {
    result.citation = sourceCitations.map((c) => ({
      '@type': 'CreativeWork',
      name: c,
    }));
  }
  return result;
}

/**
 * SpeakableSpecification (改版 v12, 2026-07-08, P0-21)
 * 让 LLM/语音助手知道页面哪些节点是"可读的摘要" (适合 TTS / 文章截取).
 * - 默认 3 个 XPath: title / h1 / article 第一段
 * - data.xpath 可自定义 (如长文页只取 .summary)
 *
 * 文档: https://schema.org/SpeakableSpecification
 * 用法: <StructuredData type="speakable" /> 或带 data.xpath
 */
function buildSpeakable(data?: Record<string, unknown>): Record<string, unknown> {
  const xpath = (data?.xpath as string[]) || [
    '/html/head/title',
    '/html/body//h1',
    '/html/body//article/p[1]',
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'SpeakableSpecification',
    xpath,
  };
}
