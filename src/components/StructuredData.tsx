/**
 * JSON-LD 结构化数据组件.
 *
 * 业务: 帮搜索引擎 / 微信爬虫 / 百度小程序 理解页面内容.
 * 用法: <StructuredData type="organization" /> 或 <StructuredData type="service" data={...} />
 *
 * 文档:
 *  - Organization: https://schema.org/Organization
 *  - WebSite: https://schema.org/WebSite
 *  - Service: https://schema.org/Service
 *  - FAQPage: https://schema.org/FAQPage
 *  - BreadcrumbList: https://schema.org/BreadcrumbList
 */

const BASE_URL = 'https://aiwill-planner.cn';
const ORG_NAME = '家有所爱工作室';
const ORG_NAME_EN = 'aiwill-planner';

interface BaseProps {
  type: 'organization' | 'website' | 'service' | 'faq' | 'breadcrumb';
  data?: Record<string, unknown>;
}

export function StructuredData({ type, data }: BaseProps) {
  let ld: Record<string, unknown>;

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
    description: '系统化生成符合中国《民法典》的遗嘱与资产规划文书, 资产规划专业人士兜底审核',
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
      // 微信公众号 (无标准 URL, 通常填主页)
      `${BASE_URL}`,
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
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
      },
      // 注: 当前无搜索功能, 注释掉 query-input
      // 'query-input': 'required name=search_term_string'
    },
  };
}

function buildService(data?: Record<string, unknown>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: '系统化家庭法律文书生成',
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
        {
          '@type': 'Offer',
          name: '专家护航版',
          description: '系统化文书 + 执业资产规划专业人士 1 对 1 审核 + 修改建议',
          price: '999',
          priceCurrency: 'CNY',
          availability: 'https://schema.org/InStock',
          url: `${BASE_URL}/payment?plan=expert`,
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
