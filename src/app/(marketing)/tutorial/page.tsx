import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '家庭文书写作教程 · 家有所爱',
  description: '6 类家庭文书的完整写作规范、模板示例和签字要求: 婚姻 / 婚内 / 离婚 / 抚养 / 赠与 / 财富传承.',
  alternates: {
    canonical: 'https://aiwill-planner.cn/tutorial',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const TUTORIALS = [
  {
    id: 'marriage',
    title: '婚姻协议书 · 写作教程',
    desc: '婚前 / 再婚财产归属约定, 婚后收入分配, 债务分担, 违约责任. 含完整模块拆解.',
    href: '/guide/pre-marriage',
    color: 'rose',
  },
  {
    id: 'marital-property',
    title: '婚内财产协议 · 写作教程',
    desc: '婚后财产明确分配, 投资 / 股权 / 不动产归属, 子女教育基金预留.',
    href: '/guide/during-marriage',
    color: 'amber',
  },
  {
    id: 'divorce',
    title: '离婚协议书 · 写作教程',
    desc: '协议离婚必备条款, 财产分割清单, 子女抚养安排, 探视 / 抚养费计算.',
    href: '/guide/divorce',
    color: 'slate',
  },
  {
    id: 'child-custody',
    title: '子女抚养协议 · 写作教程',
    desc: '抚养费计算器, 探视日历模板, 教育 / 医疗决策权, 海外特殊情况处理.',
    href: '/guide/child-custody',
    color: 'blue',
  },
  {
    id: 'gift',
    title: '赠与协议 · 写作教程',
    desc: '父母赠与明确归属, 税费测算, 过户流程, 撤销条件.',
    href: '/guide/gift',
    color: 'emerald',
  },
  {
    id: 'will',
    title: '财富传承规划 · 写作教程',
    desc: '遗嘱 / 遗赠扶养协议 / 信托 / 保险金信托 6 类工具选择, 法定继承规避.',
    href: '/guide/inheritance',
    color: 'purple',
  },
];

const COLOR_BG: Record<string, { tag: string; link: string }> = {
  rose: { tag: 'bg-rose-100 text-rose-700', link: 'text-rose-700 hover:text-rose-800' },
  amber: { tag: 'bg-amber-100 text-amber-700', link: 'text-amber-700 hover:text-amber-800' },
  slate: { tag: 'bg-slate-200 text-slate-700', link: 'text-slate-700 hover:text-slate-800' },
  blue: { tag: 'bg-blue-100 text-blue-700', link: 'text-blue-700 hover:text-blue-800' },
  emerald: { tag: 'bg-emerald-100 text-emerald-700', link: 'text-emerald-700 hover:text-emerald-800' },
  purple: { tag: 'bg-purple-100 text-purple-700', link: 'text-purple-700 hover:text-purple-800' },
};

export default function TutorialIndexPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <nav className="text-sm text-slate-500 mb-6" aria-label="面包屑">
          <Link href="/" className="hover:text-amber-600 transition">首页</Link>
          <span className="mx-1 text-slate-400" aria-hidden>/</span>
          <span className="text-slate-700">家庭文书写作教程</span>
        </nav>

        <header className="mb-8">
          <span className="inline-block bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full mb-3 font-medium">
            <span aria-hidden>📖 </span>写作教程索引
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-3 leading-tight-cn text-balance">
            家庭文书写作教程
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed-cn">
            6 类家庭文书的完整写作规范、模板示例和签字要求。
            每篇教程包含: 适用情形 + 必备条款 + 常见误区 + 模板示例 + 公证指引。
          </p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TUTORIALS.map((t) => {
            const palette = COLOR_BG[t.color];
            return (
              <Link
                key={t.id}
                href={t.href}
                className="block bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md rounded-xl p-5 transition group"
              >
                <span className={`${palette.tag} text-xs px-2 py-0.5 rounded-full inline-block mb-2 font-medium`}>
                  写作教程
                </span>
                <h2 className={`text-base font-semibold ${palette.link} leading-tight-cn group-hover:underline mb-1.5`}>
                  {t.title} →
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed-cn">{t.desc}</p>
              </Link>
            );
          })}
        </section>

        <section className="mt-12 bg-gradient-to-r from-amber-50 to-amber-100 border-2 border-amber-300 rounded-2xl p-6 sm:p-8 text-center">
          <div className="text-4xl mb-3" aria-hidden>⚡</div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2 leading-tight-cn">
            不想自己写？系统化问卷 10 分钟搞定
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mb-5 leading-relaxed-cn">
            智能版 ¥19.9 起: 问卷 + 系统化生成 + PDF / Word 导出。
            复杂场景 (跨境 / 股权 / 大额资产) 可在
            <Link href="/contact" className="text-amber-600 hover:underline mx-1">留言定制服务</Link>
            , 由资产规划专业人士 1 对 1 对接。
          </p>
          <Link
            href="/doc-type"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            选择文书类型, 开始 ¥19.9 →
          </Link>
        </section>

        <p className="mt-10 text-xs text-slate-400 text-center leading-relaxed-cn">
          本教程为系统化整理, 不构成法律意见. 复杂情况请咨询专业资产规划人员并办理公证.<br />
          沪ICP备2026020925号-1 · 数据存储于 Supabase 海外节点
        </p>
      </div>
    </main>
  );
}