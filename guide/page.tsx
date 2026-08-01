import type { Metadata } from 'next';
import Link from 'next/link';
import LegalFooter from '@/components/LegalFooter';

/**
 * /guide - 幸福指南索引页
 *
 * 6 个场景的内容矩阵入口, 提供给用户「先看指南, 再填问卷」的旅程.
 * 这是 SEO 自然流量的关键页面 — 每篇 1500+ 字长文, 目标搜索 query:
 *   "婚前财产协议怎么写" / "离婚协议模板" / "抚养费标准" / "遗嘱继承" ...
 */
export const metadata: Metadata = {
  title: '家庭文书指南 - 婚前/婚内/离婚/抚养/赠与/传承 6 大场景',
  description: '家有所爱 6 大场景家庭幸福指南: 婚前财产, 婚内约定, 离婚协议, 子女抚养, 资产赠与, 财富传承. 1500+ 字深度长文, 覆盖《民法典》条款 + 实操模板 + 常见误区.',
  keywords: [
    '婚前财产协议', '婚内财产协议', '离婚协议', '子女抚养协议',
    '赠与协议', '遗嘱', '财富传承', '民法典', '家庭文书',
    '家庭财产规划', '协议模板',
  ],
  openGraph: {
    title: '家庭文书指南 - 6 大场景深度解析 | 家有所爱',
    description: '婚前 / 婚内 / 离婚 / 抚养 / 赠与 / 传承 6 大场景幸福指南, 覆盖《民法典》核心条款 + 实操模板 + 常见误区.',
    url: 'https://aiwill-planner.cn/guide',
    siteName: '家有所爱',
    locale: 'zh_CN',
    type: 'website',
    images: [
      {
        url: '/og/guide.png',
        width: 1200,
        height: 630,
        alt: '家庭文书指南',
      },
    ],
  },
  alternates: {
    canonical: 'https://aiwill-planner.cn/guide',
    languages: {
      'zh-CN': 'https://aiwill-planner.cn/guide',
      'zh-HK': 'https://aiwill-planner.cn/guide',
      'x-default': 'https://aiwill-planner.cn/guide',
    },
  },
};

const GUIDES = [
  {
    slug: 'pre-marriage',
    title: '婚前财产协议',
    subtitle: '婚前 / 再婚财产清晰化, 让婚姻从坦诚开始',
    icon: '💑',
    color: 'rose',
    keywords: ['婚前协议', '婚前财产公证', '彩礼', '再婚财产'],
  },
  {
    slug: 'during-marriage',
    title: '婚内财产协议',
    subtitle: '已婚中产家庭财产规划, 感情稳固的定心丸',
    icon: '🏠',
    color: 'amber',
    keywords: ['婚内财产约定', '房产归属', '股权归属', '共同财产'],
  },
  {
    slug: 'divorce',
    title: '离婚协议书',
    subtitle: '财产分割 / 子女抚养 / 债务安排一站写清',
    icon: '📄',
    color: 'slate',
    keywords: ['协议离婚', '冷静期', '民政局', '财产分割'],
  },
  {
    slug: 'child-custody',
    title: '子女抚养协议',
    subtitle: '抚养费 / 探视权 / 教育规划清晰安排',
    icon: '👨‍👩‍👧',
    color: 'blue',
    keywords: ['抚养费', '探视权', '抚养权', '教育规划'],
  },
  {
    slug: 'gift',
    title: '赠与协议',
    subtitle: '房产 / 股权 / 大额资产定向传承, 可公证',
    icon: '🎁',
    color: 'emerald',
    keywords: ['房产赠与', '股权赠与', '父母赠与', '赠与公证'],
  },
  {
    slug: 'inheritance',
    title: '财富传承规划',
    subtitle: '6 种遗嘱形式 + 法定继承, 让爱意延续',
    icon: '📜',
    color: 'purple',
    keywords: ['遗嘱', '自书遗嘱', '公证遗嘱', '法定继承'],
  },
] as const;

const COLOR_CLASSES: Record<string, { bg: string; border: string; text: string; hover: string }> = {
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', hover: 'hover:border-rose-400 hover:bg-rose-100' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', hover: 'hover:border-amber-400 hover:bg-amber-100' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', hover: 'hover:border-slate-400 hover:bg-slate-100' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', hover: 'hover:border-blue-400 hover:bg-blue-100' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', hover: 'hover:border-emerald-400 hover:bg-emerald-100' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', hover: 'hover:border-purple-400 hover:bg-purple-100' },
};

export default function GuideIndex() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50">
      {/* 顶部 nav */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-amber-600 transition">
            <span aria-hidden>←</span>
            <span>返回首页</span>
          </Link>
          <Link href="/doc-type" className="text-sm text-amber-700 hover:text-amber-800 font-medium">
            直接选文书 →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* 标题区 */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-3 leading-tight-cn text-balance">
            <span aria-hidden>📚 </span>家庭文书指南
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed-cn max-w-2xl mx-auto">
            婚前 / 婚内 / 离婚 / 抚养 / 赠与 / 传承 6 大场景深度解析. 1500+ 字长文, 覆盖《民法典》核心条款 + 实操模板 + 常见误区.
          </p>
          <p className="text-xs text-slate-500 mt-3">
            最后更新: 2026-06-11 · 适用中国大陆法律
          </p>
        </div>

        {/* 指南卡片网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {GUIDES.map((g) => {
            const c = COLOR_CLASSES[g.color];
            return (
              <Link
                key={g.slug}
                href={`/guide/${g.slug}`}
                className={`${c.bg} ${c.border} ${c.hover} border-2 rounded-2xl p-6 transition-all duration-200 group`}
                aria-label={`阅读 ${g.title} 完整指南`}
              >
                <div className="text-4xl mb-3" aria-hidden>{g.icon}</div>
                <h2 className={`text-xl font-bold ${c.text} mb-2 leading-tight-cn`}>
                  {g.title}
                </h2>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed-cn min-h-[40px]">
                  {g.subtitle}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {g.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="text-xs px-2 py-0.5 bg-white/60 text-slate-600 rounded"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
                <div className="text-sm text-amber-600 font-medium group-hover:translate-x-1 transition-all">
                  阅读完整指南 →
                </div>
              </Link>
            );
          })}
        </div>

        {/* 中部 CTA */}
        <div className="mt-12 bg-gradient-to-r from-amber-100 to-amber-50 border-2 border-amber-300 rounded-2xl p-6 sm:p-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2 leading-tight-cn">
            看完指南, 现在开始制作?
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mb-5 leading-relaxed-cn">
            选一个最贴近您当前情况的场景, 系统化问卷 10 分钟生成文书草稿. ¥19.9 起.
          </p>
          <Link
            href="/doc-type"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            立即选文书类型 →
          </Link>
        </div>

        {/* 常见问题 / SEO 内容块 */}
        <section className="mt-12 bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-4 leading-tight-cn">
            <span aria-hidden>❓ </span>常见问题
          </h2>
          <div className="space-y-4 text-sm text-slate-700 leading-relaxed-cn">
            <div>
              <h3 className="font-semibold text-slate-800 mb-1">家有所爱的文书有保障效果吗?</h3>
              <p>本平台提供的所有文书均为「参考模板」, 不直接具有保障效果. 涉及不动产, 大额资产, 复杂家庭关系, 强烈建议咨询专业资产规划人员并办理公证.</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-1">需要先看指南, 还是直接选文书?</h3>
              <p>不确定的情况下, 建议先看对应场景的指南 (10 分钟阅读), 了解适用情形 + 必备条款, 再开始问卷. 已经清楚的, 可直接 <Link href="/doc-type" className="text-amber-700 hover:underline">选文书类型</Link>.</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-1">专家版和智能版区别?</h3>
              <p>智能版 ¥19.9: 问卷 + 系统化生成 + PDF / Word 导出. 专家版 ¥999: 智能版全部内容 + 资产规划专业人士 1 对 1 视频审核 + 修改建议.</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-1">数据安全吗?</h3>
              <p>所有数据存储于中国大陆腾讯云, PII 字段 AES-256 加密, 30 天可申请彻底删除. 详情见 <Link href="/privacy" className="text-amber-700 hover:underline">隐私政策</Link>.</p>
            </div>
          </div>
        </section>

        {/* 友情提示 */}
        <div className="mt-8 text-xs text-slate-400 text-center leading-relaxed-cn">
          <p>本指南为系统化整理, 不构成法律意见. 复杂情况请咨询专业资产规划人员并办理公证.</p>
          <p className="mt-1">沪ICP备2026020925号-1 · 数据存储于中国大陆腾讯云</p>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
