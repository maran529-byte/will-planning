import type { Metadata } from 'next';
import Link from 'next/link';
import LegalFooter from '@/components/LegalFooter';

/**
 * /tutorial - 写作教程索引页
 *
 * 改版 v9 (2026-06-19, SEO 内容矩阵):
 *   - 之前: /tutorial 只有一篇"遗嘱写法"教程, 跟改版后的"家庭/爱/资产传承"主线不符
 *   - 现在: /tutorial 作为 6 类文书写作教程的统一索引, 每条直跳 /guide/{slug}
 *   - 关键词: 婚前协议怎么写 / 婚内财产协议模板 / 离婚协议写法 / 抚养费标准 / 赠与协议 / 财富传承
 *   - 不再直接以"遗嘱教程"为标题, 改为"家庭文书写作教程" — 涵盖婚前/婚内/离婚/抚养/赠与/传承
 */

export const metadata: Metadata = {
  title: '家庭文书写作教程 - 婚前 / 婚内 / 离婚 / 抚养 / 赠与 / 传承',
  description:
    '把对家人的爱和财产安排写成清晰的文字。婚前协议 / 婚内财产 / 离婚协议 / 子女抚养 / 赠与 / 财富传承 6 类家庭文书完整写作教程, 依据《民法典》编写, 含模板与亲笔签名规范。',
  keywords: [
    '家庭文书写作教程',
    '婚前协议怎么写',
    '婚内财产协议模板',
    '离婚协议写法',
    '抚养费标准',
    '赠与协议模板',
    '财富传承规划',
    '民法典 1134',
    '心意表达',
    '财产安排',
  ],
  openGraph: {
    title: '家庭文书写作教程 - 6 大场景写作指南 | 家有所爱',
    description:
      '婚前 / 婚内 / 离婚 / 抚养 / 赠与 / 传承 6 类家庭文书完整写作教程, 1500+ 字深度长文, 依据《民法典》。',
    url: 'https://aiwill-planner.cn/tutorial',
    siteName: '家有所爱',
    locale: 'zh_CN',
    type: 'website',
    images: [
      {
        url: '/og/tutorial.png',
        width: 1200,
        height: 630,
        alt: '家庭文书写作教程',
      },
    ],
  },
  alternates: {
    canonical: 'https://aiwill-planner.cn/tutorial',
  },
};

interface TutorialEntry {
  slug: string;
  title: string;
  subtitle: string;
  icon: string;
  bg: string;
  border: string;
  hover: string;
  iconBg: string;
  text: string;
  keywords: string[];
  /** 跳转目标: /guide/{slug} */
  href: string;
  /** 写作要点, 1 句话总结 */
  highlight: string;
}

const TUTORIALS: TutorialEntry[] = [
  {
    slug: 'pre-marriage',
    title: '婚前 / 再婚财产协议写作教程',
    subtitle: '把婚前和再婚的财产约定写成清晰的文字, 让婚姻从坦诚开始',
    icon: '💑',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    hover: 'hover:border-rose-400 hover:bg-rose-100',
    iconBg: 'bg-rose-100 text-rose-600',
    text: 'text-rose-700',
    keywords: ['婚前协议', '婚前财产', '再婚财产', '彩礼'],
    href: '/guide/pre-marriage',
    highlight: '6 大模块, 覆盖房产 / 存款 / 投资 / 父母赠与 / 债务 / 婚后权利',
  },
  {
    slug: 'during-marriage',
    title: '婚内财产协议写作教程',
    subtitle: '已婚中产家庭财产清晰化, 感情稳固的定心丸',
    icon: '🏠',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    hover: 'hover:border-amber-400 hover:bg-amber-100',
    iconBg: 'bg-amber-100 text-amber-600',
    text: 'text-amber-700',
    keywords: ['婚内财产', '房产归属', '股权归属', '共同财产'],
    href: '/guide/during-marriage',
    highlight: '5 大场景, 含房产 / 存款 / 股权 / 投资 / 债务安排',
  },
  {
    slug: 'divorce',
    title: '离婚协议书写作教程',
    subtitle: '财产分割 / 子女抚养 / 债务安排一站写清',
    icon: '📄',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    hover: 'hover:border-slate-400 hover:bg-slate-100',
    iconBg: 'bg-slate-100 text-slate-600',
    text: 'text-slate-700',
    keywords: ['协议离婚', '冷静期', '财产分割', '民政局'],
    href: '/guide/divorce',
    highlight: '民政局流程 + 协议条款 + 冷静期, 含 5 类常见误区',
  },
  {
    slug: 'child-custody',
    title: '子女抚养协议写作教程',
    subtitle: '抚养费 / 探视权 / 教育规划清晰安排',
    icon: '👨‍👩‍👧',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    hover: 'hover:border-blue-400 hover:bg-blue-100',
    iconBg: 'bg-blue-100 text-blue-600',
    text: 'text-blue-700',
    keywords: ['抚养费', '探视权', '抚养权', '教育规划'],
    href: '/guide/child-custody',
    highlight: '抚养费计算公式 + 探视频次 + 教育/医疗/保险规划',
  },
  {
    slug: 'gift',
    title: '赠与协议写作教程',
    subtitle: '房产 / 股权 / 大额资产定向传承, 可公证',
    icon: '🎁',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    hover: 'hover:border-emerald-400 hover:bg-emerald-100',
    iconBg: 'bg-emerald-100 text-emerald-600',
    text: 'text-emerald-700',
    keywords: ['房产赠与', '股权赠与', '父母赠与', '赠与公证'],
    href: '/guide/gift',
    highlight: '4 类赠与场景 + 税费说明 + 公证流程',
  },
  {
    slug: 'inheritance',
    title: '家庭传承规划写作教程',
    subtitle: '把家庭资产安排好, 让爱意延续',
    icon: '📜',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    hover: 'hover:border-purple-400 hover:bg-purple-100',
    iconBg: 'bg-purple-100 text-purple-600',
    text: 'text-purple-700',
    keywords: ['家庭传承', '法定继承', '公证', '民法典 1134'],
    href: '/guide/inheritance',
    highlight: '6 种形式 + 法定继承顺位 + 公证 / 自书 / 代书对比',
  },
];

export default function TutorialIndex() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50">
      {/* 顶部 nav */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-600 hover:text-amber-600 transition"
          >
            <span aria-hidden>←</span>
            <span>返回首页</span>
          </Link>
          <Link
            href="/guide"
            className="text-sm text-amber-700 hover:text-amber-800 font-medium"
          >
            幸福指南首页 →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* 标题区 */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-3 leading-tight-cn text-balance">
            <span aria-hidden>📝 </span>家庭文书写作教程
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed-cn max-w-2xl mx-auto">
            把对家人的爱和财产安排, 写成清晰的文字。
            婚前 / 婚内 / 离婚 / 抚养 / 赠与 / 家庭传承 6 类文书写作指南,
            1500+ 字深度长文, 覆盖《民法典》核心条款 + 实操模板 + 常见误区。
          </p>
          <p className="text-xs text-slate-500 mt-3">
            最后更新: 2026-06-19 · 适用中国大陆法律
          </p>
        </div>

        {/* 教程卡片网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TUTORIALS.map((t) => (
            <Link
              key={t.slug}
              href={t.href}
              className={`${t.bg} ${t.border} ${t.hover} border-2 rounded-2xl p-6 transition-all duration-200 group`}
              aria-label={`阅读 ${t.title}`}
            >
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 ${t.iconBg} rounded-xl flex items-center justify-center text-2xl mb-3`}
                aria-hidden
              >
                {t.icon}
              </div>
              <h2 className={`text-xl font-bold ${t.text} mb-2 leading-tight-cn`}>
                {t.title}
              </h2>
              <p className="text-slate-600 text-sm mb-3 leading-relaxed-cn min-h-[40px]">
                {t.subtitle}
              </p>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed-cn italic">
                {t.highlight}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {t.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="text-xs px-2 py-0.5 bg-white/60 text-slate-600 rounded"
                  >
                    {kw}
                  </span>
                ))}
              </div>
              <div className="text-sm text-amber-600 font-medium group-hover:translate-x-1 transition-all">
                阅读完整教程 →
              </div>
            </Link>
          ))}
        </div>

        {/* 中部 CTA */}
        <div className="mt-12 bg-gradient-to-r from-amber-100 to-amber-50 border-2 border-amber-300 rounded-2xl p-6 sm:p-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2 leading-tight-cn">
            看完教程, 现在开始制作?
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mb-5 leading-relaxed-cn">
            选一个最贴近您当前情况的场景, 系统化问卷 10 分钟生成文书草稿。¥19.9 起。
          </p>
          <Link
            href="/doc-type"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            立即选文书类型 →
          </Link>
        </div>

        {/* FAQ */}
        <section className="mt-12 bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-4 leading-tight-cn">
            <span aria-hidden>❓ </span>常见问题
          </h2>
          <div className="space-y-4 text-sm text-slate-700 leading-relaxed-cn">
            <div>
              <h3 className="font-semibold text-slate-800 mb-1">需要先看教程, 还是直接选文书?</h3>
              <p>不确定的情况下, 建议先看对应场景的教程 (10 分钟阅读), 了解适用情形 + 必备条款, 再开始问卷。已经清楚的, 可直接 <Link href="/doc-type" className="text-amber-700 hover:underline">选文书类型</Link>。</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-1">教程里提到的写作规范, 保障效果如何?</h3>
              <p>本平台提供的是写作模板参考, 依据《民法典》核心条款编写。涉及不动产 / 大额资产 / 复杂家庭关系, 建议办理公证以确保最大保障效果。</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-1">专家版和智能版区别?</h3>
              <p>智能版 ¥19.9: 问卷 + 系统化生成 + PDF / Word 导出。专家版 ¥999: 智能版全部内容 + 资产规划专业人士 1 对 1 视频审核 + 修改建议。</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-1">数据安全吗?</h3>
              <p>所有数据存储于中国大陆腾讯云, PII 字段 AES-256 加密, 30 天可申请彻底删除。详情见 <Link href="/privacy" className="text-amber-700 hover:underline">隐私政策</Link>。</p>
            </div>
          </div>
        </section>

        {/* 友情提示 */}
        <div className="mt-8 text-xs text-slate-400 text-center leading-relaxed-cn">
          <p>本教程为系统化整理, 不构成法律意见。复杂情况请咨询专业资产规划人员并办理公证。</p>
          <p className="mt-1">沪ICP备2026020925号-1 · 数据存储于中国大陆腾讯云</p>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
