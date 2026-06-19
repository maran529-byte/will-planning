import Link from "next/link";
import { PRICING } from "@/lib/config";
import { VisitorIdBanner } from "@/components/VisitorIdBanner";
import { StructuredData } from "@/components/StructuredData";
import { BrandLogo } from "@/components/BrandLogo";
import { readUserSession } from "@/lib/user-auth";
import { DOCUMENT_TYPES, COLOR_CLASSES } from "@/lib/document-types";

const MAIN_SITE = "https://aiwill-planner.cn";   // 主站 (CN, 合规)
const H5_SITE   = "https://h5.aiwill-planner.cn"; // 移动端 (overseas)

export default async function HomePage() {
  // 改版 v4 (2026-06-08, Phase B): 顶部 nav 根据登录状态切换
  // - 已登录 → "我的" 链接 (→ /dashboard)
  // - 未登录 → "登录" 链接 (→ /login) + 单独的"注册"链接
  // 改版 v5 (2026-06-09): DOCUMENT_TYPES 提取到 @/lib/document-types
  //   与 /doc-type /result /questionnaire 共享单点源
  const session = await readUserSession();
  const isLoggedIn = !!session;

  return (
    <div className="landing-page">
      {/* 访客编号提示横幅 (Phase 2) - 仅在未绑定时显示 */}
      <VisitorIdBanner />
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BrandLogo size="md" />
          </div>
          <nav className="hidden md:flex gap-6 text-slate-600 text-sm items-center" aria-label="主导航">
            <a href="#documents" className="hover:text-amber-600 transition">文书类型</a>
            <a href="#pricing" className="hover:text-amber-600 transition">定价</a>
            <Link href="/guide" className="hover:text-amber-600 transition">法律指南</Link>
            <a href="/affiliate" className="hover:text-amber-600 transition">博主计划</a>
            <a
              href={H5_SITE}
              className="hover:text-amber-600 transition inline-flex items-center gap-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              移动端
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="text-slate-600 hover:text-amber-600 text-sm font-medium transition px-3 py-2"
              >
                我的
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-slate-600 hover:text-amber-600 text-sm font-medium transition px-3 py-2"
                >
                  登录
                </Link>
                <Link
                  href="/register"
                  className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

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
            我们的模板 10 分钟帮您整理好婚姻协议、婚内财产、抚养安排等专业法律文书。
            不用约专业资产规划人员、不用跑律所, 资产规划专业人士在线审核, ¥19.9 起。
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

      {/* 文书类型选择 */}
      <section id="documents" className="py-16 px-4">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4 text-slate-800 text-balance">
            6 类家庭法律文书, 一站搞定
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
            全程在线, 不用排队, 不用跑律所
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

      {/* 定价方案 */}
      <section id="pricing" className="py-16 px-4">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4 text-slate-800 text-balance">透明定价</h2>
          <p className="text-slate-600 text-center mb-12 leading-relaxed-cn">根据您的需求选择合适的服务方案</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto items-stretch">
            {/* 智能版 */}
            <div className="pricing-card flex flex-col h-full">
              <div className="text-center mb-6">
                {PRICING.guide.promoText && (
                  <span className="inline-block bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full mb-2">
                    {PRICING.guide.promoText}
                  </span>
                )}
                <h3 className="text-xl font-bold mb-2">{PRICING.guide.name}</h3>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed-cn">{PRICING.guide.description}</p>
                <div className="text-4xl font-bold text-slate-800 tabular-nums">
                  ¥{PRICING.guide.price}
                </div>
              </div>
              <ul className="space-y-3 mb-6 text-sm flex-1">
                <li className="flex items-center gap-2">
                  <span className="text-green-500" aria-hidden>✓</span>
                  <span>智能问卷引导</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500" aria-hidden>✓</span>
                  <span>文书草稿生成</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500" aria-hidden>✓</span>
                  <span>PDF文件导出</span>
                </li>
                <li className="flex items-center gap-2 text-slate-400">
                  <span aria-hidden>✗</span>
                  <span>专家审核（需另付费）</span>
                </li>
              </ul>
              <Link
                href="/doc-type?plan=ai"
                className="block text-center bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 rounded-lg transition mt-auto"
              >
                立即开始
              </Link>
            </div>

            {/* 专家护航版 */}
            <div className="pricing-card featured flex flex-col h-full">
              <span className="featured-badge">推荐</span>
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2">{PRICING.expertReview.name}</h3>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed-cn">{PRICING.expertReview.description}</p>
                <div className="text-4xl font-bold text-amber-600 tabular-nums">
                  ¥{PRICING.expertReview.price}
                </div>
              </div>
              <ul className="space-y-3 mb-6 text-sm flex-1">
                <li className="flex items-center gap-2">
                  <span className="text-green-500" aria-hidden>✓</span>
                  <span>智能问卷引导</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500" aria-hidden>✓</span>
                  <span>文书草稿生成</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500" aria-hidden>✓</span>
                  <span>资产规划专业人士视频审核</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500" aria-hidden>✓</span>
                  <span>签署指引文档</span>
                </li>
              </ul>
              <Link
                href="/doc-type?plan=expert"
                className="block text-center bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-lg transition mt-auto"
              >
                立即开始
              </Link>
            </div>
          </div>

          <p className="text-center text-slate-500 text-sm mt-8">
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
                <span>系统化起草的协议有法律效力吗？</span>
                <span
                  className="text-slate-400 group-open:rotate-180 transition-transform"
                  aria-hidden
                >▾</span>
              </summary>
              <p className="mt-4 text-slate-600 leading-relaxed-cn">
                模板为草稿文本, 需经当事人签字 (或公证) 后才具备法律效力。
                我们建议涉及房产、股权、大额资产的文书完成公证以确保最大法律效力。
                选 ¥999 专家版可获得资产规划专业人士 1 对 1 视频审核。
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
                不会。所有数据存储于中国大陆腾讯云, 银行级加密;
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
          </div>
        </div>
      </section>

      {/* 法律免责 — 法律免责声明保留在内容区, 让 LegalFooter (来自根 layout) 统一承担页脚职责,
          避免双 footer 重复。 */}
      <div className="bg-slate-100 border-t border-slate-200 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm leading-relaxed-cn">
            本平台仅提供婚姻 / 财产 / 抚养 / 赠与等家庭法律文书的智能生成参考, 不构成法律专业意见; 涉及不动产 / 大额资产 / 复杂家庭关系建议咨询专业资产规划人员并办理公证
          </p>
        </div>
      </div>

      {/* SEO: 结构化数据 (Service + FAQ) - 改版 v6: FAQ 措辞聚焦"婚姻/资产/抚养" */}
      <StructuredData type="service" />
      <StructuredData
        type="faq"
        data={{
          faqs: [
            { q: '系统化起草的婚姻协议有法律效力吗？', a: '模板版生成的为草稿, 需经双方签字 (或公证) 后才具备法律效力。涉及房产、股权、大额资产建议办理公证。' },
            { q: '需要多长时间完成一份协议？', a: '填写问卷约 8-10 分钟, 系统化生成约 1 分钟, 即可下载 PDF/Word 文件。' },
            { q: '我的婚姻 / 财产信息会泄露吗？', a: '所有数据存储于中国大陆腾讯云, 符合《数据安全法》; PII 字段 (身份证/手机号) 单独加密, 30 天可申请彻底删除。' },
            { q: '专家版 (¥999) 和 智能版 (¥19.9) 的区别？', a: '智能版由系统化模板生成, 适合常见标准场景; 专家版增加资产规划专业人士 1 对 1 视频审核 + 修改建议, 适合跨境资产 / 股权设计等复杂情况。' },
            { q: '婚前 / 婚内 / 离婚该选哪类？', a: '婚前 / 再婚选「婚姻协议书」; 已婚想明确财产选「婚内财产协议」; 准备分手选「离婚协议书」+「子女抚养协议」(如有未成年子女)。' },
            { q: '支付后还能修改协议内容吗？', a: '支付前可无限次重新填写; 支付后还有 3 次「免费修改」机会, 之后可联系客服。' },
          ],
        }}
      />
    </div>
  );
}
