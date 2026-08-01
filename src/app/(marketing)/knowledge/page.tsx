/**
 * /knowledge - 知识中心入口 (主域)
 *
 * 改版 v1 (2026-07-08): N1 修复.
 * `/guide/<topic>` 路径已迁至 `/knowledge/<category>/<slug>` (近 30+ 篇长文),
 * 父页 `/knowledge` 不存在会让 SEO 收录与用户收藏失效.
 *
 * 本页作用:
 *  - 列出 6 大分类 (婚姻 / 财产 / 离婚 / 抚养 / 赠与 / 传承)
 *  - 每个分类下挂热度最高的 2-3 篇长文 + 该分类下的"开始填写"入口
 *  - 内嵌 FAQPage + ItemList + BreadcrumbList, 强化 GEO 信号
 */

import Link from 'next/link';
import type { Metadata } from 'next';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = {
  title: '知识中心 · 婚姻/财产/离婚/抚养/赠与/传承',
  description:
    '家有所爱知识中心, 6 大分类, 30+ 篇深度长文, 覆盖婚前/婚内/离婚/子女抚养/赠与/传承, 民法典条款 + 实操模板 + 常见误区',
  keywords: [
    '婚前财产协议',
    '婚内财产协议',
    '离婚协议',
    '子女抚养',
    '赠与协议',
    '财富传承',
    '民法典',
    '家庭文书',
  ],
  alternates: {
    canonical: 'https://aiwill-planner.cn/knowledge',
    languages: {
      'zh-CN': 'https://aiwill-planner.cn/knowledge',
      'zh-HK': 'https://aiwill-planner.cn/knowledge',
      'x-default': 'https://aiwill-planner.cn/knowledge',
    },
  },
  openGraph: {
    title: '家有所爱 · 知识中心',
    description:
      '6 大分类, 30+ 篇深度长文, 覆盖婚前/婚内/离婚/抚养/赠与/传承',
    url: 'https://aiwill-planner.cn/knowledge',
    type: 'website',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: '家有所爱 · 知识中心',
      },
    ],
  },
};

interface CategoryEntry {
  slug: string;
  title: string;
  description: string;
  icon: string;
  docType: string;
  articles: Array<{ slug: string; title: string }>;
  color: 'rose' | 'amber' | 'slate' | 'blue' | 'emerald' | 'purple';
}

const COLOR_CLASSES: Record<
  CategoryEntry['color'],
  { bg: string; text: string; border: string }
> = {
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  slate: {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
  },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
};

const CATEGORIES: CategoryEntry[] = [
  {
    slug: 'marriage',
    title: '婚姻',
    description: '婚前约定、再婚家庭、财产隔离',
    icon: '💑',
    docType: 'pre-marriage',
    color: 'rose',
    articles: [
      {
        slug: 'pre-marriage-property-agreement',
        title: '婚前财产协议: 法律、情感、资产保护三维解读',
      },
      {
        slug: 'self-vs-template-vs-lawyer',
        title: '婚前协议自助/模板/律师 三种路径对比',
      },
      {
        slug: 'remarriage-family-property-guide',
        title: '再婚家庭财产规划: 继子女/前婚子女隔离',
      },
    ],
  },
  {
    slug: 'property',
    title: '财产',
    description: '婚内财产约定、共有份额、债务隔离',
    icon: '🏠',
    docType: 'during-marriage',
    color: 'amber',
    articles: [
      {
        slug: 'during-marriage-property',
        title: '婚内财产协议: 6 类条款 3 个常见误区',
      },
    ],
  },
  {
    slug: 'divorce',
    title: '离婚',
    description: '协议离婚、冷静期、子女抚养安排',
    icon: '📄',
    docType: 'divorce',
    color: 'slate',
    articles: [
      { slug: 'divorce-agreement', title: '离婚协议书怎么写: 民政局流程与冷静期' },
    ],
  },
  {
    slug: 'custody',
    title: '抚养',
    description: '抚养费、探视权、教育规划',
    icon: '👨‍👩‍👧',
    docType: 'child-custody',
    color: 'blue',
    articles: [
      {
        slug: 'child-custody-agreement',
        title: '子女抚养协议怎么写: 抚养费/探视权/教育',
      },
    ],
  },
  {
    slug: 'gift',
    title: '赠与',
    description: '房产、股权、大额资产定向传承',
    icon: '🎁',
    docType: 'gift',
    color: 'emerald',
    articles: [{ slug: 'gift-to-children', title: '父母赠与子女: 房产/股权/现金三种路径' }],
  },
  {
    slug: 'inheritance',
    title: '传承',
    description: '遗嘱、法定继承、遗赠扶养协议',
    icon: '📜',
    docType: 'will',
    color: 'purple',
    articles: [
      {
        slug: 'inheritance-will-types',
        title: '民法典继承编深度解读: 法定/遗嘱/遗赠',
      },
    ],
  },
];

export default function KnowledgePage() {
  // ItemList schema: 每个分类作为 ListItem
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '家有所爱知识中心',
    itemListElement: CATEGORIES.map((cat, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: cat.title,
      url: `https://aiwill-planner.cn/knowledge/${cat.slug}`,
    })),
  };

  // FAQ schema: 关于知识中心的常见疑问
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '家有所爱知识中心与首页 doc-type 的关系?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '知识中心是阅读路径(深度文章+法律条款+常见误区), doc-type 是行动路径(选择文书类型→填写问卷→生成草稿)。建议先读知识中心建立认知, 再去 doc-type 生成具体文书。',
        },
      },
      {
        '@type': 'Question',
        name: '文章内容来自哪里?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '所有文章由家有所爱工作室整理, 参考《民法典》婚姻家庭编+继承编+合同编、相关司法解释、最高法典型案例、以及一线家事律师的实操经验。每个文章底部附参考资料与最后更新日期。',
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50">
      {/* 顶部 nav */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-600 hover:text-amber-600 transition leading-tight-cn"
          >
            <span aria-hidden>←</span>
            <span>返回首页</span>
          </Link>
          <h2 className="text-sm text-slate-500" aria-label="当前页">
            知识中心
          </h2>
          <div className="w-20" aria-hidden />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* Hero */}
        <div className="text-center mb-10 sm:mb-14">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-3 text-balance">
            知识中心 · 6 大分类 · 30+ 篇深度长文
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed-cn max-w-2xl mx-auto">
            民法典条款 + 实操模板 + 常见误区, 让您在动手前建立完整认知
          </p>
        </div>

        {/* 分类网格 */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CATEGORIES.map((cat) => {
            const c = COLOR_CLASSES[cat.color];
            return (
              <article
                key={cat.slug}
                className={`bg-white rounded-2xl shadow-sm p-6 border-2 ${c.border} hover:shadow-md transition`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-12 h-12 ${c.bg} rounded-xl flex items-center justify-center text-2xl`}
                    aria-hidden
                  >
                    {cat.icon}
                  </div>
                  <h2 className={`text-xl font-bold ${c.text} leading-tight-cn`}>
                    {cat.title}
                  </h2>
                </div>
                <p className="text-sm text-slate-500 mb-4 leading-relaxed-cn">
                  {cat.description}
                </p>

                <ul className="space-y-2 mb-5 text-sm">
                  {cat.articles.map((a) => (
                    <li key={a.slug}>
                      <Link
                        href={`/knowledge/${cat.slug}/${a.slug}`}
                        className={`block ${c.text} hover:underline leading-relaxed-cn line-clamp-1`}
                      >
                        📖 {a.title}
                      </Link>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/doc-type?type=${cat.docType}`}
                  className={`block w-full text-center ${c.bg} hover:opacity-80 ${c.text} font-semibold py-2 rounded-xl border ${c.border} transition`}
                >
                  开始生成{cat.title}文书 →
                </Link>
              </article>
            );
          })}
        </section>

        {/* 信任锚 */}
        <section className="mt-12 bg-gradient-to-r from-slate-50 to-amber-50 rounded-2xl p-6 sm:p-8 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-3 leading-tight-cn">
            <span aria-hidden>📚 </span>为什么做知识中心?
          </h2>
          <p className="text-slate-700 leading-relaxed-cn mb-3">
            真实的家庭文书背后, 是一系列法律条款、财产结构、家庭关系与未来风险的取舍。
            我们认为, 在您点 "开始填写" 之前, 应该先建立完整认知 ——
            这样填写时不会遗漏关键项, 也不会被网上"模板片段"误导。
          </p>
          <p className="text-sm text-slate-600 leading-relaxed-cn">
            所有文章由家有所爱工作室整理, 参考《民法典》及最高法相关解释。
            具体个案请咨询当地有执业资质的家事律师, 详见
            <Link
              href="/methodology"
              className="text-amber-600 hover:text-amber-700 underline mx-1"
            >
              方法论
            </Link>
            与
            <Link
              href="/terms"
              className="text-amber-600 hover:text-amber-700 underline mx-1"
            >
              服务条款
            </Link>
            。
          </p>
        </section>
      </main>

      {/* Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <StructuredData
        type="breadcrumb"
        data={{
          items: [
            { name: '首页', url: '/' },
            { name: '知识中心', url: '/knowledge' },
          ],
        }}
      />
    </div>
  );
}
