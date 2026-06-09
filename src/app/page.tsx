import Link from "next/link";
import { PRICING } from "@/lib/config";
import { VisitorIdBanner } from "@/components/VisitorIdBanner";
import { StructuredData } from "@/components/StructuredData";
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
            <span className="text-2xl" aria-hidden>⚖️</span>
            <span className="text-xl font-bold text-slate-800 leading-tight-cn">爱的延续</span>
          </div>
          <nav className="hidden md:flex gap-6 text-slate-600 text-sm items-center" aria-label="主导航">
            <a href="#documents" className="hover:text-amber-600 transition">文书类型</a>
            <a href="#pricing" className="hover:text-amber-600 transition">定价</a>
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
                  className="text-slate-600 hover:text-amber-600 text-sm font-medium transition px-3 py-2 hidden sm:inline"
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

      {/* Hero区域 */}
      <section className="hero-section">
        <div className="max-w-4xl mx-auto px-4 text-center-block">
          <div className="trust-badge mb-6 inline-flex" role="note" aria-label="专业资产规划团队与数据加密保护">
            <span aria-hidden>🛡️</span>
            <span>专业资产规划团队 | 数据加密保护</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-center text-balance">
            保护您的财富<br />传承您的爱
          </h1>
          <p className="text-xl text-slate-200 mb-8 max-w-2xl mx-auto text-center leading-relaxed-cn">
            AI智能生成各类法律文书：婚姻协议、婚内财产约定、离婚协议、遗嘱等。
            资产规划专业人士把关，让您的意愿得到妥善安排。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/doc-type" className="btn-primary">
              开始创建文书 · ¥19.9起
            </Link>
            {/* 改版 v5: 不再用 inline style, 改用 btn-secondary--on-dark modifier */}
            <a href="#documents" className="btn-secondary btn-secondary--on-dark">
              查看全部类型
            </a>
          </div>
        </div>
      </section>

      {/* 文书类型选择 */}
      <section id="documents" className="py-16 px-4">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4 text-slate-800 text-balance">选择您的文书类型</h2>
          <p className="text-slate-600 text-center mb-12 leading-relaxed-cn">
            覆盖婚姻家庭各类法律文书需求 · 限时优惠 ¥19.9
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

      {/* 服务流程 */}
      <section id="process" className="py-16 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4 text-slate-800 text-balance">简单四步，完成文书</h2>
          <p className="text-slate-600 text-center mb-12 leading-relaxed-cn">全程在线操作，无需到场排队</p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="flow-step">
              <div className="step-number" aria-hidden>1</div>
              <div>
                <h3 className="font-semibold text-lg mb-2">选择文书类型</h3>
                <p className="text-slate-600 text-sm leading-relaxed-cn">根据您的需求选择对应的法律文书类型</p>
              </div>
            </div>
            <div className="flow-step">
              <div className="step-number" aria-hidden>2</div>
              <div>
                <h3 className="font-semibold text-lg mb-2">填写问卷</h3>
                <p className="text-slate-600 text-sm leading-relaxed-cn">回答相关问题，AI实时理解您的需求</p>
              </div>
            </div>
            <div className="flow-step">
              <div className="step-number" aria-hidden>3</div>
              <div>
                <h3 className="font-semibold text-lg mb-2">AI生成草稿</h3>
                <p className="text-slate-600 text-sm leading-relaxed-cn">基于您的回答，AI即时生成文书草稿</p>
              </div>
            </div>
            <div className="flow-step">
              <div className="step-number" aria-hidden>4</div>
              <div>
                <h3 className="font-semibold text-lg mb-2">付费下载</h3>
                <p className="text-slate-600 text-sm leading-relaxed-cn">支付后即可下载PDF/Word文件</p>
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
            {/* AI智能版 */}
            <div className="pricing-card flex flex-col h-full">
              <div className="text-center mb-6">
                {PRICING.aiGuide.promoText && (
                  <span className="inline-block bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full mb-2">
                    {PRICING.aiGuide.promoText}
                  </span>
                )}
                <h3 className="text-xl font-bold mb-2">{PRICING.aiGuide.name}</h3>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed-cn">{PRICING.aiGuide.description}</p>
                <div className="text-4xl font-bold text-slate-800 tabular-nums">
                  ¥{PRICING.aiGuide.price}
                </div>
              </div>
              <ul className="space-y-3 mb-6 text-sm flex-1">
                <li className="flex items-center gap-2">
                  <span className="text-green-500" aria-hidden>✓</span>
                  <span>AI问卷引导</span>
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
                  <span>AI问卷引导</span>
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

      {/* 常见问题 */}
      <section id="faq" className="py-16 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-slate-800 text-balance">常见问题</h2>

          <div className="space-y-6">
            <details className="bg-white rounded-lg p-6 shadow-sm group">
              <summary className="font-semibold text-lg cursor-pointer list-none flex items-center justify-between">
                <span>生成的文书有法律效力吗？</span>
                <span
                  className="text-slate-400 group-open:rotate-180 transition-transform"
                  aria-hidden
                >▾</span>
              </summary>
              <p className="mt-4 text-slate-600 leading-relaxed-cn">
                AI生成的仅为草稿模板，需经当事人签字或公证后才具备法律效力。
                我们建议重要文书（如房产赠与、离婚协议等）完成公证以确保最大法律效力。
              </p>
            </details>

            <details className="bg-white rounded-lg p-6 shadow-sm group">
              <summary className="font-semibold text-lg cursor-pointer list-none flex items-center justify-between">
                <span>我的信息是否安全？</span>
                <span
                  className="text-slate-400 group-open:rotate-180 transition-transform"
                  aria-hidden
                >▾</span>
              </summary>
              <p className="mt-4 text-slate-600 leading-relaxed-cn">
                我们采用银行级加密存储，所有数据仅用于生成文书，不会泄露给第三方。
                文书内容仅保存在您自己的设备和我们安全的服务器上。
              </p>
            </details>

            <details className="bg-white rounded-lg p-6 shadow-sm group">
              <summary className="font-semibold text-lg cursor-pointer list-none flex items-center justify-between">
                <span>如何修改已生成的文书？</span>
                <span
                  className="text-slate-400 group-open:rotate-180 transition-transform"
                  aria-hidden
                >▾</span>
              </summary>
              <p className="mt-4 text-slate-600 leading-relaxed-cn">
                在支付前，您可以无限次重新填写问卷并生成新草稿。
                支付后如需修改，可联系客服或重新购买生成服务。
              </p>
            </details>

            <details className="bg-white rounded-lg p-6 shadow-sm group">
              <summary className="font-semibold text-lg cursor-pointer list-none flex items-center justify-between">
                <span>支持哪些文件格式下载？</span>
                <span
                  className="text-slate-400 group-open:rotate-180 transition-transform"
                  aria-hidden
                >▾</span>
              </summary>
              <p className="mt-4 text-slate-600 leading-relaxed-cn">
                付费后，您可以下载PDF和Word两种格式的文书文件，方便您查看和打印。
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
            本平台仅提供文书模板智能生成参考，不构成法律专业意见，所有文书仅供个人参考使用
          </p>
        </div>
      </div>

      {/* SEO: 结构化数据 (Service + FAQ) */}
      <StructuredData type="service" />
      <StructuredData
        type="faq"
        data={{
          faqs: [
            { q: 'AI 生成的文书具有法律效力吗？', a: '不具有。AI 智能版仅供个人参考, 涉及不动产 / 大额资产 / 复杂家庭关系请咨询执业律师并办理公证。' },
            { q: '需要多长时间生成文书？', a: '填写问卷约 10-15 分钟, AI 生成约 1-2 分钟, 即可下载 PDF/Word 文件。' },
            { q: '个人信息是否安全？', a: '所有数据存储于中国大陆腾讯云, 符合《数据安全法》; PII 字段加密存储, 30 天可申请彻底删除。' },
            { q: '专家护航版和 AI 智能版的区别？', a: 'AI 智能版 (¥19.9) 纯 AI 生成; 专家护航版 (¥999) 增加执业律师 1 对 1 审核 + 修改建议, 适合复杂情况。' },
            { q: '如何修改已生成的文书？', a: '在支付前, 您可以无限次重新填写问卷并生成新草稿。支付后如需修改, 可联系客服。' },
            { q: '支持哪些文件格式下载？', a: '付费后, 您可以下载 PDF 和 Word 两种格式的文书文件, 方便查看和打印。' },
          ],
        }}
      />
    </div>
  );
}
