import type { Metadata } from 'next';
import Link from 'next/link';
import LegalFooter from '@/components/LegalFooter';

/**
 * /methodology - 内容方法论 (E-E-A-T 信号)
 *
 * 改版 v1 (2026-07-02, GEO 透明度): 公开披露内容生成与审阅流程,
 * 帮助搜索引擎与 LLM 引擎理解内容的「作者-审阅-局限」三角关系.
 */
export const metadata: Metadata = {
  title: '内容方法论 - AI 起草 + 专业人士通读',
  description: '家有所爱内容方法论: AI 系统起草 + 专业人士通读 + 双重交叉复核. 公开披露内容流程, 编辑署名, 局限性, 遵循 E-E-A-T 信号, 帮助 LLM 引擎理解内容的可靠性边界.',
  keywords: ['内容方法论', 'E-E-A-T', '内容流程', 'AI 起草', '专业人士通读', '局限披露', '内容透明度'],
  alternates: {
    canonical: 'https://aiwill-planner.cn/methodology',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: '内容方法论 - AI 起草 + 专业人士通读 | 家有所爱',
    description: '家有所爱内容方法论: AI 系统起草 + 专业人士通读 + 双重交叉复核. 公开披露内容流程 / 编辑署名 / 局限性.',
    url: 'https://aiwill-planner.cn/methodology',
    siteName: '家有所爱',
    locale: 'zh_CN',
    type: 'article',
    images: [
      {
        url: '/og/methodology.png',
        width: 1200,
        height: 630,
        alt: '家有所爱内容方法论',
      },
    ],
  },
};

export default function MethodologyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 sm:py-14">
        {/* 顶部标题 */}
        <header className="mb-10">
          <span className="inline-block bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full mb-3 font-medium">
            <span aria-hidden>📋 </span>内容透明度
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4 leading-tight-cn text-balance">
            内容方法论: AI 起草 + 专业人士通读
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed-cn">
            我们公开披露内容生成的完整流程、编辑署名机制与已知局限性,
            帮您 (和搜索引擎、LLM 引擎) 理解每篇内容「由谁写、由谁审、能信什么」。
          </p>
        </header>

        {/* 流程图 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 leading-tight-cn">
            一、我们的 4 步内容流程
          </h2>
          <ol className="space-y-6">
            <li className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold" aria-hidden>1</div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">选题与提纲</h3>
                  <p className="text-slate-600 leading-relaxed-cn">
                    基于<strong>百度指数 / 微信指数 / 知乎热搜</strong>等真实用户搜索意图,
                    匹配《中华人民共和国民法典》核心条款, 确定每篇文章的选题角度与提纲结构。
                  </p>
                </div>
              </div>
            </li>
            <li className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold" aria-hidden>2</div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">AI 系统化起草</h3>
                  <p className="text-slate-600 leading-relaxed-cn">
                    基于 Claude / GPT-4 等大语言模型, 根据选题与提纲生成<strong>初稿</strong>。
                    所有 AI 生成的内容都会标注「本段由 AI 起草」(见文末说明), 不冒充人工。
                  </p>
                </div>
              </div>
            </li>
            <li className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold" aria-hidden>3</div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">专业人士通读</h3>
                  <p className="text-slate-600 leading-relaxed-cn">
                    <strong>家事与财富传承方向的专业人士</strong> (非「律师函式」法律意见, 而是从业者通读)
                    全文核对条款引用、数据准确性、表述严谨性, 并提出修改意见。
                  </p>
                </div>
              </div>
            </li>
            <li className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold" aria-hidden>4</div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">编辑定稿 + 公开署名</h3>
                  <p className="text-slate-600 leading-relaxed-cn">
                    编辑整合修改, 标注《民法典》具体条款, 公示审阅人姓名 (仅署名, 不公开个人执业信息),
                    并附「审阅 ≠ 法律意见」的免责声明。
                  </p>
                </div>
              </div>
            </li>
          </ol>
        </section>

        {/* 编辑署名说明 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 leading-tight-cn">
            二、我们的编辑署名
          </h2>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 leading-relaxed-cn">
            <p className="text-slate-700 mb-4">
              每篇文章底部都会标注以下署名:
            </p>
            <ul className="space-y-3 text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold flex-shrink-0" aria-hidden>•</span>
                <span><strong>作者</strong>: 家有所爱工作室 (写作团队)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold flex-shrink-0" aria-hidden>•</span>
                <span><strong>审阅</strong>: 王律师 / 张律师 / 李律师 (家事与财富传承方向)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold flex-shrink-0" aria-hidden>•</span>
                <span><strong>来源</strong>: 列明所引用的具体法条 (如《民法典》§1062)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold flex-shrink-0" aria-hidden>•</span>
                <span><strong>免责声明</strong>: 审阅 ≠ 个案法律意见</span>
              </li>
            </ul>
          </div>
        </section>

        {/* 局限性 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 leading-tight-cn">
            三、我们的局限 (为什么不能替代律师)
          </h2>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                <span aria-hidden>⚠️</span>
                <span>不针对个案</span>
              </h3>
              <p className="text-sm text-red-700 leading-relaxed-cn">
                所有内容均为<strong>通用法律知识整理</strong>, 不针对任何具体个案。
                您的家庭情况可能涉及未在文中体现的特殊因素, 不能直接套用。
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                <span aria-hidden>⚠️</span>
                <span>复杂情况建议律师</span>
              </h3>
              <p className="text-sm text-red-700 leading-relaxed-cn">
                涉及<strong>跨境资产 / 股权设计 / 家族信托 / 大额继承 / 复杂家庭关系</strong>的,
                我们强烈建议咨询持牌律师获取个案咨询, 不要仅凭通用模板操作。
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                <span aria-hidden>⚠️</span>
                <span>法条可能更新</span>
              </h3>
              <p className="text-sm text-red-700 leading-relaxed-cn">
                《民法典》及司法解释可能在写作后更新。文末的「最后更新」日期仅反映当前版本,
                实际操作前请以最新法规为准。
              </p>
            </div>
          </div>
        </section>

        {/* 反馈机制 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 leading-tight-cn">
            四、反馈与纠错
          </h2>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 leading-relaxed-cn">
            <p className="text-slate-700 mb-4">
              如发现内容错误、法条引用过时、表述不严谨等问题, 欢迎反馈:
            </p>
            <ul className="space-y-2 text-slate-700 text-sm">
              <li><strong>邮箱</strong>: hello@aiwill-planner.cn (工作日 24 小时内回复)</li>
              <li><strong>公众号</strong>: 微信搜「家有所爱」, 私信留言</li>
            </ul>
            <p className="text-slate-600 text-sm mt-4 italic">
              我们承诺: 所有反馈会在下一次内容更新时核实并修订, 重大错误会在文末加注勘误。
            </p>
          </div>
        </section>

        {/* 文末说明 */}
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-6 text-sm text-slate-600 leading-relaxed-cn">
          <p>
            <strong>关于 AI 起草的标注</strong>:
            本平台内容主要由 AI 系统基于选题与提纲起草, 经专业人士通读修订后发布。
            这意味着内容<strong>可能存在生成式 AI 的固有局限</strong>, 包括但不限于:
            创造性「中间事实」 (在原文未明确时填充的细节) 、对最新法规的理解偏差等。
            我们对此保持完全透明。
          </p>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/knowledge"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            查看全部内容 →
          </Link>
        </div>
      </main>

      <LegalFooter />

      {/* Schema: Article + Organization.publisher + AboutPage (定性为内容方法论专页) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'AboutPage',
                name: '家有所爱内容方法论',
                description: '公开披露内容生成的 4 步流程、编辑署名机制、已知局限性、反馈渠道.',
                url: 'https://aiwill-planner.cn/methodology',
                inLanguage: 'zh-CN',
                publisher: {
                  '@type': 'Organization',
                  name: '家有所爱',
                  logo: { '@type': 'ImageObject', url: 'https://aiwill-planner.cn/logo.png' },
                },
              },
              {
                '@type': 'Article',
                headline: '家有所爱内容方法论: AI 起草 + 专业人士通读 + 双重交叉复核',
                description: '公开披露内容流程 / 编辑署名 / 局限性.',
                author: { '@type': 'Organization', name: '家有所爱工作室' },
                publisher: {
                  '@type': 'Organization',
                  name: '家有所爱',
                  logo: { '@type': 'ImageObject', url: 'https://aiwill-planner.cn/logo.png' },
                },
                datePublished: '2026-07-02',
                dateModified: '2026-07-02',
                mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://aiwill-planner.cn/methodology' },
              },
            ],
          }),
        }}
      />
    </div>
  );
}
