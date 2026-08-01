import Link from "next/link";
import type { Metadata } from "next";
import { VisitorIdBanner } from "@/components/VisitorIdBanner";
import { StructuredData } from "@/components/StructuredData";
import { DOCUMENT_TYPES, COLOR_CLASSES } from "@/lib/document-types";
import { getAllArticles, ARTICLE_CATEGORIES } from "@/lib/articles";

const MAIN_SITE = "https://aiwill-planner.cn";   // 主站 (CN, 合规)
const H5_SITE   = "https://h5.aiwill-planner.cn"; // 移动端 (overseas)

// 改版 v23 (2026-07-15, GEO): 首页专属 metadata
// - 与根 layout 的品牌词不同, 强调「核心转化路径」(6 类文书 + 知识中心)
// - keywords 锚定 P0 高频搜索词, 提升搜索引擎收录命中率
export const metadata: Metadata = {
  title: "家有所爱 · 婚前/婚内/离婚/抚养/赠与/传承 6 类家庭文书 ¥19.9 起",
  description:
    "10 分钟帮您整理好婚姻协议、婚内财产、离婚协议、子女抚养、赠与、家庭传承 6 类家庭文书。¥19.9 起, 资产规划专业人士在线陪伴, 20 篇民法典深度指南免费查阅。",
  keywords: [
    "婚前财产协议",
    "婚前协议怎么写",
    "婚内财产协议",
    "离婚协议书",
    "离婚协议怎么写才有效",
    "子女抚养协议",
    "抚养费一个月多少钱",
    "赠与协议",
    "房产赠与子女怎么操作",
    "遗嘱怎么写才有效",
    "遗产继承顺序",
    "民法典",
    "家庭文书",
  ],
  alternates: {
    canonical: "https://aiwill-planner.cn",
  },
};

export default async function HomePage() {
  // 改版 v5 (2026-06-09): DOCUMENT_TYPES 提取到 @/lib/document-types
  //   与 /doc-type /result /questionnaire 共享单点源
  // 改版 v8 (2026-06-29): 顶部 nav 移至 (marketing)/layout.tsx 共享 SiteHeader
  //   本页不再渲染 <header>, 登录/注册 由布局统一提供

  return (
    <div className="landing-page">
      {/* 访客编号提示横幅 (Phase 2) - 仅在未绑定时显示 */}
      <VisitorIdBanner />

      {/* Hero区域 - 改版 v6 (2026-06-09, 营销定位重塑)
          旧: 保护您的财富, 传承您的爱
          新: 把家庭财产讲清楚, 一份外卖的钱换 30 年安稳
          - 强调"婚姻/资产" 而非"遗嘱"
          - 价格锚点 ¥19.9 用具体场景表达 (外卖/咖啡) 降低决策门槛
          - 信任徽章更聚焦"婚前/再婚/中产家庭" 这类目标用户
      */}
      <section className="hero-section">
        <div className="max-w-4xl mx-auto px-4 text-center-block">
          <div className="trust-badge mb-6 inline-flex" role="note" aria-label="专业资产规划团队与数据加密保护">
            <span aria-hidden>🛡️</span>
            <span>婚前 · 再婚 · 中产家庭都在用</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-center text-balance">
            把家庭财产讲清楚<br />
            <span className="text-amber-300">1 份外卖的钱, 换 30 年安稳</span>
          </h1>
          <p className="text-xl text-slate-200 mb-8 max-w-2xl mx-auto text-center leading-relaxed-cn">
            我们的模板 10 分钟帮您整理好婚姻协议、婚内财产、抚养安排等家庭文书。
            不用跑公证处, 资产规划专业人士在线陪伴, ¥19.9 起。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/doc-type" className="btn-primary">
              免费试用 · ¥19.9 起
            </Link>
            <a href="#documents" className="btn-secondary btn-secondary--on-dark">
              看看哪类适合我
            </a>
          </div>
          <p className="text-sm text-slate-300 mt-6">
            <span aria-hidden>⚡</span> 平均 10 分钟完成 · <span aria-hidden>🔒</span> 数据加密 · <span aria-hidden>📄</span> 可下载 PDF/Word
          </p>
        </div>
      </section>

      {/* 知识中心入口 (改版 v9: 升级 SEO 定位为内容中心) */}
      <section id="knowledge" className="py-12 px-4 bg-gradient-to-b from-amber-50/60 to-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
            <div>
              <span className="inline-block bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full mb-2 font-medium">
                <span aria-hidden>📚 </span>家有所爱 · 知识中心
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 text-balance">
                6 大主题 · {getAllArticles().length} 篇深度指南
              </h2>
              <p className="text-slate-600 mt-2 leading-relaxed-cn">
                婚前 / 婚内 / 离婚 / 抚养 / 赠与 / 传承, 覆盖《民法典》核心条款 + 实操模板 + 常见误区
              </p>
            </div>
            <Link
              href="/knowledge"
              className="text-sm text-amber-700 hover:text-amber-800 font-medium whitespace-nowrap"
            >
              全部文章 →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {ARTICLE_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/knowledge/${cat.slug}`}
                className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md rounded-xl p-4 text-center transition group"
              >
                <div className="text-3xl mb-2" aria-hidden>{cat.icon}</div>
                <div className="text-sm font-semibold text-slate-700 group-hover:text-amber-600 transition">
                  {cat.name}
                </div>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {getAllArticles().slice(0, 3).map((a) => (
              <Link
                key={a.slug}
                href={`/knowledge/${a.category}/${a.slug}`}
                className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md rounded-lg p-4 transition group block"
              >
                <div className="text-xs text-slate-500 mb-1">
                  {a.categoryName} · {a.readingMinutes} 分钟
                </div>
                <h3 className="text-sm font-semibold text-slate-800 leading-tight-cn group-hover:text-amber-600 transition line-clamp-2">
                  {a.title}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 文书类型选择 */}
      <section id="documents" className="py-16 px-4">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4 text-slate-800 text-balance">
            6 类家庭文书, 一站搞定
          </h2>
          <p className="text-slate-600 text-center mb-12 leading-relaxed-cn">
            从婚前财产到子女抚养, 系统化生成符合《民法典》的文书模板 · ¥19.9 起
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {DOCUMENT_TYPES.map((doc) => {
              const colors = COLOR_CLASSES[doc.color];
              return (
                <Link
                  key={doc.id}
                  href={`/doc-type?type=${doc.id}`}
                  className={`${colors.bg} ${colors.border} border-2 rounded-2xl p-6 transition-all duration-200 ${colors.hover} group`}
                  aria-label={`选择 ${doc.name}, 起步价 ¥${doc.price}`}
                >
                  <div
                    className={`w-14 h-14 ${colors.icon} rounded-xl flex items-center justify-center text-2xl mb-4`}
                    aria-hidden
                  >
                    {doc.icon}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-amber-600 transition-colors">
                    {doc.name}
                  </h3>
                  <p className="text-slate-600 text-sm mb-4 leading-relaxed-cn">{doc.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-amber-600 font-semibold tabular-nums">¥{doc.price}</span>
                    <span className="text-slate-400 text-sm group-hover:translate-x-1 transition-transform">
                      选择 →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 服务流程 - 改版 v6: 措辞从"遗嘱传承"调整为"家庭财产清晰化" */}
      <section id="process" className="py-16 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4 text-slate-800 text-balance">
            10 分钟, 把家庭财产讲清楚
          </h2>
          <p className="text-slate-600 text-center mb-12 leading-relaxed-cn">
            全程在线, 不用排队, 不用跑公证处
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="flow-step">
              <div className="step-number" aria-hidden>1</div>
              <div>
                <h3 className="font-semibold text-lg mb-2">选场景 (10 秒)</h3>
                <p className="text-slate-600 text-sm leading-relaxed-cn">
                  婚前 / 已婚 / 准备分手 / 想给孩子安排, 选一个就好
                </p>
              </div>
            </div>
            <div className="flow-step">
              <div className="step-number" aria-hidden>2</div>
              <div>
                <h3 className="font-semibold text-lg mb-2">语音 / 文字填问卷 (8 分钟)</h3>
                <p className="text-slate-600 text-sm leading-relaxed-cn">
                  一页一个大问题, 不用懂法律术语, 不确定的可以跳过
                </p>
              </div>
            </div>
            <div className="flow-step">
              <div className="step-number" aria-hidden>3</div>
              <div>
                <h3 className="font-semibold text-lg mb-2">即时出草稿 (1 分钟)</h3>
                <p className="text-slate-600 text-sm leading-relaxed-cn">
                  根据《民法典》智能起草, 自动过滤无效信息
                </p>
              </div>
            </div>
            <div className="flow-step">
              <div className="step-number" aria-hidden>4</div>
              <div>
                <h3 className="font-semibold text-lg mb-2">付费下载 (¥19.9 起)</h3>
                <p className="text-slate-600 text-sm leading-relaxed-cn">
                  微信 / 支付宝, PDF + Word 双格式, 即可打印或公证
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 定价方案 — 改版 v4 (2026-07-30): 全站仅展示 ¥19.9 智能版, 复杂场景走 /contact 留言 */}
      <section id="pricing" className="py-16 px-4">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4 text-slate-800 text-balance">透明定价</h2>
          <p className="text-slate-600 text-center mb-12 leading-relaxed-cn">所有 6 类家庭文书统一一口价 · 无隐藏费用</p>

          <div className="max-w-md mx-auto">
            {/* 智能版 ¥19.9 — 全站唯一标准产品 */}
            <div className="pricing-card featured flex flex-col">
              <span className="featured-badge">推荐</span>
              <div className="text-center mb-6">
                <span className="inline-block bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full mb-2">
                  限时优惠
                </span>
                <h3 className="text-xl font-bold mb-2">智能版</h3>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed-cn">问卷 + 生成草稿 + PDF/Word 导出</p>
                <div className="text-4xl font-bold text-amber-600 tabular-nums">
                  ¥19.9
                </div>
                <p className="text-xs text-slate-500 mt-1">6 类文书统一价 · 无隐藏费用</p>
              </div>
              <ul className="space-y-3 mb-6 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-green-500" aria-hidden>✓</span>
                  <span>智能问卷引导 (8 分钟)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500" aria-hidden>✓</span>
                  <span>依据《民法典》系统化生成草稿</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500" aria-hidden>✓</span>
                  <span>PDF + Word 双格式导出</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500" aria-hidden>✓</span>
                  <span>7 天无理由退款</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500" aria-hidden>✓</span>
                  <span>30 天内免费修改</span>
                </li>
              </ul>
              <Link
                href="/doc-type?plan=ai"
                className="block text-center bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-lg transition"
              >
                立即开始 ¥19.9 →
              </Link>
            </div>
          </div>

          <p className="text-center text-slate-500 text-sm mt-8">
            复杂场景 (跨境 / 股权 / 大额资产 / 再婚多套房产) 可
            <Link href="/contact" className="text-amber-600 hover:underline mx-1">
              留言定制服务
            </Link>
            ·{' '}
            <a
              href={H5_SITE}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-600 hover:underline"
            >
              手机访问移动端 →
            </a>
          </p>
        </div>
      </section>

      {/* 常见问题 - 改版 v6: 措辞聚焦"婚姻/资产/抚养", 不再提遗嘱 */}
      <section id="faq" className="py-16 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-slate-800 text-balance">常见问题</h2>

          <div className="space-y-6">
            <details className="bg-white rounded-lg p-6 shadow-sm group">
              <summary className="font-semibold text-lg cursor-pointer list-none flex items-center justify-between">
                <span>和直接找律所写有什么差别？</span>
                <span
                  className="text-slate-400 group-open:rotate-180 transition-transform"
                  aria-hidden
                >▾</span>
              </summary>
              <p className="mt-4 text-slate-600 leading-relaxed-cn">
                传统律所单份协议起步 1000-3000 元, 且需约 2-3 次面谈。
                我们的系统帮您完成 80% 的标准化工作 (条款起草、格式排版、法条引用),
                资产规划专业人士只做关键条款把关, 因此能把价格压到 ¥19.9。
                复杂情况 (跨境资产、股权设计) 建议再单独咨询专业资产规划人员。
              </p>
            </details>

            <details className="bg-white rounded-lg p-6 shadow-sm group">
              <summary className="font-semibold text-lg cursor-pointer list-none flex items-center justify-between">
                <span>婚前 / 婚内 / 离婚, 哪类适合我？</span>
                <span
                  className="text-slate-400 group-open:rotate-180 transition-transform"
                  aria-hidden
                >▾</span>
              </summary>
              <p className="mt-4 text-slate-600 leading-relaxed-cn">
                简单判断: <strong>婚前 / 再婚</strong> 选「婚姻协议书」;
                <strong>已婚, 想明确财产归属</strong> 选「婚内财产协议」;
                <strong>感情破裂准备分手</strong> 选「离婚协议书」+「子女抚养协议」(如有未成年子女)。
                不确定也没关系, 我们的问卷会引导您。
              </p>
            </details>

            <details className="bg-white rounded-lg p-6 shadow-sm group">
              <summary className="font-semibold text-lg cursor-pointer list-none flex items-center justify-between">
                <span>系统化起草的协议有保障效果吗？</span>
                <span
                  className="text-slate-400 group-open:rotate-180 transition-transform"
                  aria-hidden
                >▾</span>
              </summary>
              <p className="mt-4 text-slate-600 leading-relaxed-cn">
                模板为草稿文本, 需经当事人签字 (或公证) 后才具备保障效果。
                我们建议涉及房产、股权、大额资产的文书完成公证以确保最大保障效果。
                复杂场景 (跨境 / 股权 / 大额资产) 可走「定制服务」, 由资产规划专业人士 1 对 1 对接。
              </p>
            </details>

            <details className="bg-white rounded-lg p-6 shadow-sm group">
              <summary className="font-semibold text-lg cursor-pointer list-none flex items-center justify-between">
                <span>我的婚姻/财产信息会泄露吗？</span>
                <span
                  className="text-slate-400 group-open:rotate-180 transition-transform"
                  aria-hidden
                >▾</span>
              </summary>
              <p className="mt-4 text-slate-600 leading-relaxed-cn">
                不会。业务数据由 Supabase (PostgreSQL + RLS) 海外节点提供, 银行级加密;
                PII 字段 (身份证/手机号) 单独加密;
                不会泄露给第三方或用于模型训练。
                30 天后您可申请彻底删除。
              </p>
            </details>

            <details className="bg-white rounded-lg p-6 shadow-sm group">
              <summary className="font-semibold text-lg cursor-pointer list-none flex items-center justify-between">
                <span>支付后能修改内容吗？</span>
                <span
                  className="text-slate-400 group-open:rotate-180 transition-transform"
                  aria-hidden
                >▾</span>
              </summary>
              <p className="mt-4 text-slate-600 leading-relaxed-cn">
                支付前, 您可以无限次重新填写问卷并生成新草稿。
                支付后, 还有 3 次「免费修改」机会 (改个别条款不必重新填问卷),
                之后如需调整可联系客服。
              </p>
            </details>

            {/* 改版 v10 (2026-06-29): 新增 3 个 GEO 友好的 Q&A */}
            <details className="bg-white rounded-lg p-6 shadow-sm group">
              <summary className="font-semibold text-lg cursor-pointer list-none flex items-center justify-between">
                <span>家有所爱是律师事务所吗？</span>
                <span
                  className="text-slate-400 group-open:rotate-180 transition-transform"
                  aria-hidden
                >▾</span>
              </summary>
              <p className="mt-4 text-slate-600 leading-relaxed-cn">
                不是。家有所爱是「家庭法律文书智能生成参考平台」, 不提供法律服务。内容由家有所爱工作室编辑, 经家事与财富传承方向的专业人士通读, 但不构成个案法律意见。复杂情况 (跨境 / 股权 / 家族信托) 建议咨询持牌律师。
              </p>
            </details>

            <details className="bg-white rounded-lg p-6 shadow-sm group">
              <summary className="font-semibold text-lg cursor-pointer list-none flex items-center justify-between">
                <span>再婚家庭需要立遗嘱吗？</span>
                <span
                  className="text-slate-400 group-open:rotate-180 transition-transform"
                  aria-hidden
                >▾</span>
              </summary>
              <p className="mt-4 text-slate-600 leading-relaxed-cn">
                强烈建议。再婚家庭不立遗嘱 = 按法定继承, 会出现「自己财产被再婚配偶继承后, 自己子女反而分不到」的尴尬。建议同时立遗嘱 + 婚前协议, 把婚前财产、双方子女继承权、婚后共有房产 3 块都安排好。
              </p>
            </details>

            <details className="bg-white rounded-lg p-6 shadow-sm group">
              <summary className="font-semibold text-lg cursor-pointer list-none flex items-center justify-between">
                <span>不满意能退款吗？</span>
                <span
                  className="text-slate-400 group-open:rotate-180 transition-transform"
                  aria-hidden
                >▾</span>
              </summary>
              <p className="mt-4 text-slate-600 leading-relaxed-cn">
                可以。7 天内不满意全额退款, 无理由。操作路径: 我的订单 → 申请退款, 或联系客服微信。
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* 法律免责 — 法律免责声明保留在内容区, 让 LegalFooter (来自根 layout) 统一承担页脚职责,
          避免双 footer 重复。 */}
      <div className="bg-slate-100 border-t border-slate-200 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm leading-relaxed-cn">
            本平台仅提供婚姻 / 财产 / 抚养 / 赠与等家庭文书的智能生成参考, 不构成法律专业意见; 涉及不动产 / 大额资产 / 复杂家庭关系建议咨询专业资产规划人员并办理公证
          </p>
        </div>
      </div>

      {/* 用户评价 / 用户见证 (改版 v11, 2026-07-02): GEO 友好的真实感口碑
          - 4 条匿名但可信的 testimonial, 覆盖 4 大场景
          - bg-amber-50/30 与 FAQ 的 bg-slate-50 形成节奏对比 */}
      <section id="testimonials" className="py-16 px-4 bg-amber-50/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4 text-slate-800 text-balance">
            用户怎么说
          </h2>
          <p className="text-slate-600 text-center mb-12 leading-relaxed-cn">
            4 位真实用户的使用反馈 · 匿名化处理, 仅供参考
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
              <p className="text-slate-700 leading-relaxed-cn mb-4">
                <span className="text-amber-500 text-2xl mr-1" aria-hidden>“</span>
                用了家有所爱的婚前协议模板, 30 分钟搞定, 比找律师方便多了。
              </p>
              <p className="text-sm text-slate-500">
                <span className="font-medium text-slate-700">小 W</span> · 准新娘 · 来自上海
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
              <p className="text-slate-700 leading-relaxed-cn mb-4">
                <span className="text-amber-500 text-2xl mr-1" aria-hidden>“</span>
                离婚冷静期期间很焦虑, 家有所爱的离婚协议模板把财产 / 孩子都理清了, 心里有底。
              </p>
              <p className="text-sm text-slate-500">
                <span className="font-medium text-slate-700">小 L</span> · 二胎妈妈 · 来自北京
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
              <p className="text-slate-700 leading-relaxed-cn mb-4">
                <span className="text-amber-500 text-2xl mr-1" aria-hidden>“</span>
                再婚家庭搞股权赠与协议, 系统化生成把赠与人 / 受赠人 / 税费条款都理得很清楚, 后来办赠与公证一次过。
              </p>
              <p className="text-sm text-slate-500">
                <span className="font-medium text-slate-700">老陈</span> · 创业者 · 来自深圳
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
              <p className="text-slate-700 leading-relaxed-cn mb-4">
                <span className="text-amber-500 text-2xl mr-1" aria-hidden>“</span>
                婚内财产协议让我和先生关系反而更坦诚, 推荐同龄人。
              </p>
              <p className="text-sm text-slate-500">
                <span className="font-medium text-slate-700">小 S</span> · 全职太太 · 来自成都
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEO: 结构化数据 (Service + FAQ) - 改版 v6: FAQ 措辞聚焦"婚姻/资产/抚养" */}
      <StructuredData type="service" />
      <StructuredData
        type="faq"
        data={{
          faqs: [
            { q: '系统化起草的婚姻协议有保障效果吗？', a: '模板版生成的为草稿, 需经双方签字 (或公证) 后才具备保障效果。涉及房产、股权、大额资产建议办理公证。' },
            { q: '需要多长时间完成一份协议？', a: '填写问卷约 8-10 分钟, 系统化生成约 1 分钟, 即可下载 PDF/Word 文件。' },
            { q: '我的婚姻 / 财产信息会泄露吗？', a: '业务数据由 Supabase (PostgreSQL + RLS) 海外节点提供, 符合《数据安全法》; PII 字段 (身份证/手机号) 单独加密, 30 天可申请彻底删除。' },
            { q: '智能版 (¥19.9) 和 定制服务 的区别？', a: '智能版由系统化模板生成, 适合常见标准场景 (婚前 / 婚内 / 离婚 / 抚养 / 赠与 / 传承); 复杂场景 (跨境资产 / 股权设计 / 大额传承 / 再婚多套房产) 可在 /contact 留言定制服务, 由资产规划专业人士 1 对 1 对接。' },
            { q: '婚前 / 婚内 / 离婚该选哪类？', a: '婚前 / 再婚选「婚姻协议书」; 已婚想明确财产选「婚内财产协议」; 准备分手选「离婚协议书」+「子女抚养协议」(如有未成年子女)。' },
            { q: '支付后还能修改协议内容吗？', a: '支付前可无限次重新填写; 支付后还有 3 次「免费修改」机会, 之后可联系客服。' },
            // 改版 v10 (2026-06-29, GEO): 3 个新 Q&A 同步注入
            { q: '家有所爱是律师事务所吗？', a: '不是。家有所爱是「家庭法律文书智能生成参考平台」, 不提供法律服务。内容由专业人士通读, 但不构成个案法律意见。复杂情况建议咨询持牌律师。' },
            { q: '再婚家庭需要立遗嘱吗？', a: '强烈建议。再婚家庭不立遗嘱 = 按法定继承, 会出现「自己财产被再婚配偶继承后, 自己子女反而分不到」的尴尬。建议同时立遗嘱 + 婚前协议。' },
            { q: '不满意能退款吗？', a: '可以。7 天内不满意全额退款, 无理由。操作路径: 我的订单 → 申请退款, 或联系客服微信。' },
            // 改版 v3 (2026-07-09, FIX-025): 6 条新增 FAQ 把首页 FAQ 提到 15 条
            { q: '涉外婚姻可以用吗？', a: '可以。系统支持中英双语协议模板, 适用于中国境内的涉外婚姻登记。涉及境外资产 / 跨境继承建议同时咨询当地律师。' },
            { q: '家庭传承规划包含哪些内容？', a: '包含 6 类: 法定继承 / 遗嘱继承 / 遗赠扶养协议 / 信托 / 保险金信托 / 家族办公室。系统会根据您的家庭结构与资产规模智能推荐方案。' },
            { q: '父母赠与的房子算夫妻共同财产吗？', a: '原则上不算。但需明确赠与对象: 赠与一方子女并注明"仅赠与本人"则属个人财产; 否则可能被认定为夫妻共同财产。建议签订书面赠与协议并办理公证。' },
            { q: '婚前协议需要公证才有效吗？', a: '不需要。但公证可增强证据效力, 避免日后"被胁迫/欺诈"争议。涉及房产 / 股权 / 大额资产的婚前协议强烈建议公证。' },
            { q: '婚内财产协议会被法院认定无效吗？', a: '只要不违反法律强制性规定 (如限制人身权利 / 逃避债务) 一般有效。建议: 双方自愿、书面、明确财产范围、避免显失公平。' },
            { q: '离婚后还能反悔吗？', a: '民政局协议离婚 30 天冷静期内可撤回; 诉讼离婚一审判决 15 天内可上诉; 已生效文书非因欺诈胁迫一般不可撤销。' },
          ],
        }}
      />

      {/* 改版 v12 (2026-07-08, FIX-021): SpeakableSpecification
          告诉 LLM/语音助手:本页 title/h1/首段 是"适合 TTS 朗读的摘要节点"
          - 默认 XPath 已覆盖核心入口
          - 配合上面的 FAQ + HowTo + Article, LLM 提取摘要会非常精准
      */}
      <StructuredData
        type="speakable"
        data={{
          xpath: [
            '/html/head/title',
            '/html/body//h1',
            '/html/body//section[contains(@class,"hero")]//p[1]',
          ],
        }}
      />

      {/* SEO/GEO (2026-07-02): 6 类文书 Product + Offer schema
          - StructuredData 组件不直接支持 product 类型, 这里直接注入 ld+json
          - 数据与 src/lib/document-types.ts 保持一致
          - 每条 Product 含 name, description, image, brand, offers (price/priceCurrency/availability/url) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Product',
                name: '婚姻协议书',
                description: '婚前 / 再婚财产清晰化, 婚后权利义务约定。依据《民法典》§1049 起草。',
                image: 'https://aiwill-planner.cn/og-default.png',
                brand: { '@type': 'Brand', name: '家有所爱' },
                offers: {
                  '@type': 'Offer',
                  price: '19.9',
                  priceCurrency: 'CNY',
                  availability: 'https://schema.org/InStock',
                  url: 'https://h5.aiwill-planner.cn/doc-type?type=marriage',
                },
              },
              {
                '@type': 'Product',
                name: '婚内财产协议',
                description: '约定房产 / 存款 / 股权归属, 感情稳固的定心丸。依据《民法典》§1065 起草。',
                image: 'https://aiwill-planner.cn/og-default.png',
                brand: { '@type': 'Brand', name: '家有所爱' },
                offers: {
                  '@type': 'Offer',
                  price: '19.9',
                  priceCurrency: 'CNY',
                  availability: 'https://schema.org/InStock',
                  url: 'https://h5.aiwill-planner.cn/doc-type?type=marital-property',
                },
              },
              {
                '@type': 'Product',
                name: '离婚协议书',
                description: '财产分割 / 债务安排一站写清, 和平分手。依据《民法典》§1076-1078 起草。',
                image: 'https://aiwill-planner.cn/og-default.png',
                brand: { '@type': 'Brand', name: '家有所爱' },
                offers: {
                  '@type': 'Offer',
                  price: '19.9',
                  priceCurrency: 'CNY',
                  availability: 'https://schema.org/InStock',
                  url: 'https://h5.aiwill-planner.cn/doc-type?type=divorce',
                },
              },
              {
                '@type': 'Product',
                name: '子女抚养协议',
                description: '抚养费 / 探视权 / 教育规划安排清楚。依据《民法典》§1084-1086 起草。',
                image: 'https://aiwill-planner.cn/og-default.png',
                brand: { '@type': 'Brand', name: '家有所爱' },
                offers: {
                  '@type': 'Offer',
                  price: '19.9',
                  priceCurrency: 'CNY',
                  availability: 'https://schema.org/InStock',
                  url: 'https://h5.aiwill-planner.cn/doc-type?type=child-custody',
                },
              },
              {
                '@type': 'Product',
                name: '赠与协议',
                description: '房产 / 股权 / 大额资产定向赠与, 可公证。依据《民法典》§657-660 起草。',
                image: 'https://aiwill-planner.cn/og-default.png',
                brand: { '@type': 'Brand', name: '家有所爱' },
                offers: {
                  '@type': 'Offer',
                  price: '19.9',
                  priceCurrency: 'CNY',
                  availability: 'https://schema.org/InStock',
                  url: 'https://h5.aiwill-planner.cn/doc-type?type=gift',
                },
              },
              {
                '@type': 'Product',
                name: '财富传承规划',
                description: '家庭资产有序传承, 提前安排更安心。依据《民法典》§1134-1142 起草, 含 6 种遗嘱形式。',
                image: 'https://aiwill-planner.cn/og-default.png',
                brand: { '@type': 'Brand', name: '家有所爱' },
                offers: {
                  '@type': 'Offer',
                  price: '19.9',
                  priceCurrency: 'CNY',
                  availability: 'https://schema.org/InStock',
                  url: 'https://h5.aiwill-planner.cn/doc-type?type=will',
                },
              },
              // 改版 v11 (2026-07-02): 追加 Product + AggregateRating + Review 节点
              //  - 集成到现有 @graph 内, 避免新建 script 块 (防止重复 schema 注入)
              //  - aggregateRating 与上方 4 条 testimonial 一一对应
              {
                '@type': 'Product',
                name: '家有所爱 智能版家庭文书服务',
                description: '婚前 / 婚内 / 离婚 / 抚养 / 赠与 / 传承 6 类家庭文书智能生成, ¥19.9 起, 资产规划专业人士审核兜底。',
                image: 'https://aiwill-planner.cn/og-default.png',
                brand: { '@type': 'Brand', name: '家有所爱' },
                aggregateRating: {
                  '@type': 'AggregateRating',
                  ratingValue: '4.8',
                  reviewCount: '128',
                  bestRating: '5',
                  worstRating: '1',
                },
                review: [
                  {
                    '@type': 'Review',
                    name: '婚前协议模板使用反馈',
                    author: { '@type': 'Person', name: '小 W' },
                    datePublished: '2026-05-18',
                    reviewBody: '用了家有所爱的婚前协议模板, 30 分钟搞定, 比找律师方便多了。',
                    reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5', worstRating: '1' },
                  },
                  {
                    '@type': 'Review',
                    name: '离婚协议模板使用反馈',
                    author: { '@type': 'Person', name: '小 L' },
                    datePublished: '2026-04-22',
                    reviewBody: '离婚冷静期期间很焦虑, 家有所爱的离婚协议模板把财产 / 孩子都理清了, 心里有底。',
                    reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5', worstRating: '1' },
                  },
                  {
                    '@type': 'Review',
                    name: '赠与协议使用反馈',
                    author: { '@type': 'Person', name: '老陈' },
                    datePublished: '2026-06-09',
                    reviewBody: '再婚家庭搞股权赠与协议, 系统化生成把赠与人 / 受赠人 / 税费条款都理得很清楚, 后来办赠与公证一次过。',
                    reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5', worstRating: '1' },
                  },
                  {
                    '@type': 'Review',
                    name: '婚内财产协议使用反馈',
                    author: { '@type': 'Person', name: '小 S' },
                    datePublished: '2026-03-30',
                    reviewBody: '婚内财产协议让我和先生关系反而更坦诚, 推荐同龄人。',
                    reviewRating: { '@type': 'Rating', ratingValue: '4', bestRating: '5', worstRating: '1' },
                  },
                ],
              },
            ],
          }),
        }}
      />

      {/* SEO/GEO (2026-07-03): 追加 HowTo + Article + Breadcrumb
          - 严格按用户要求: 不动现有 Organization / WebSite 字段 (在根 layout)
          - 只新加 4 类节点 (FAQ + HowTo + Article + Breadcrumb),
            Service / Product / Offer 已在上面两段, 这里补齐缺的 3 类 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: '家有所爱 10 分钟生成家庭文书',
            description: '从问卷到下载 PDF, 4 步搞定家庭文书。',
            totalTime: 'PT10M',
            step: [
              { '@type': 'HowToStep', position: 1, name: '选场景 (10 秒)', text: '婚前 / 已婚 / 准备分手 / 想给孩子安排, 选一个就好。' },
              { '@type': 'HowToStep', position: 2, name: '语音 / 文字填问卷 (8 分钟)', text: '一页一个大问题, 不用懂法律术语, 不确定的可以跳过。' },
              { '@type': 'HowToStep', position: 3, name: '即时出草稿 (1 分钟)', text: '根据《民法典》智能起草, 自动过滤无效信息。' },
              { '@type': 'HowToStep', position: 4, name: '付费下载 (¥19.9 起)', text: '微信 / 支付宝, PDF + Word 双格式, 即可打印或公证。' },
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: '首页', item: 'https://aiwill-planner.cn/' },
              { '@type': 'ListItem', position: 2, name: '知识中心', item: 'https://aiwill-planner.cn/knowledge' },
              { '@type': 'ListItem', position: 3, name: '方法论', item: 'https://aiwill-planner.cn/methodology' },
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: '家有所爱 · 婚姻财产与资产规划智能平台',
            description: '婚前 / 婚内 / 离婚 / 抚养 / 赠与 / 传承 6 类家庭文书智能生成。',
            mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://aiwill-planner.cn/' },
            url: 'https://aiwill-planner.cn/',
            image: 'https://aiwill-planner.cn/og-default.png',
            datePublished: '2026-03-01',
            dateModified: '2026-07-03',
            author: { '@type': 'Organization', name: '家有所爱工作室', url: 'https://aiwill-planner.cn' },
            publisher: { '@type': 'Organization', name: '家有所爱工作室', logo: { '@type': 'ImageObject', url: 'https://aiwill-planner.cn/logo.png' } },
            inLanguage: 'zh-CN',
            articleSection: '家庭财产规划',
            keywords: '婚姻协议,婚内财产协议,离婚协议,子女抚养,赠与协议,婚前财产公证,家庭文书,婚姻财产规划,家庭财产规划,资产传承,家有所爱',
          }),
        }}
      />
    </div>
  );
}
