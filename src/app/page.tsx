import Link from "next/link";
import { PRICING } from "@/lib/config";

const MAIN_SITE = "https://aiwill-planner.cn";   // 主站 (CN, 合规)
const H5_SITE   = "https://h5.aiwill-planner.cn"; // 移动端 (overseas)

// 文书类型定义
const DOCUMENT_TYPES = [
  {
    id: "marriage",
    name: "婚姻协议书",
    description: "明确婚后财产分配、权利义务",
    icon: "💑",
    color: "rose",
    price: 99,
  },
  {
    id: "marital-property",
    name: "婚内财产协议",
    description: "约定婚姻存续期间财产归属",
    icon: "🏠",
    color: "amber",
    price: 129,
  },
  {
    id: "divorce",
    name: "离婚协议",
    description: "子女抚养、财产分割协议",
    icon: "📄",
    color: "slate",
    price: 159,
  },
  {
    id: "child-custody",
    name: "子女抚养协议",
    description: "明确抚养费、探视权安排",
    icon: "👨‍👩‍👧",
    color: "blue",
    price: 99,
  },
  {
    id: "gift",
    name: "赠与协议",
    description: "房产、财产赠与公证文书",
    icon: "🎁",
    color: "emerald",
    price: 89,
  },
  {
    id: "will",
    name: "遗嘱",
    description: "遗产分配、继承人指定",
    icon: "⚖️",
    color: "purple",
    price: 19.9,
  },
];

// 颜色映射
const colorClasses: Record<string, { bg: string; border: string; text: string; hover: string; icon: string }> = {
  rose: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    hover: "hover:border-rose-400 hover:bg-rose-100",
    icon: "bg-rose-100 text-rose-600",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    hover: "hover:border-amber-400 hover:bg-amber-100",
    icon: "bg-amber-100 text-amber-600",
  },
  slate: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-700",
    hover: "hover:border-slate-400 hover:bg-slate-100",
    icon: "bg-slate-100 text-slate-600",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    hover: "hover:border-blue-400 hover:bg-blue-100",
    icon: "bg-blue-100 text-blue-600",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    hover: "hover:border-emerald-400 hover:bg-emerald-100",
    icon: "bg-emerald-100 text-emerald-600",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    hover: "hover:border-purple-400 hover:bg-purple-100",
    icon: "bg-purple-100 text-purple-600",
  },
};

export default function HomePage() {
  return (
    <div className="landing-page">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚖️</span>
            <span className="text-xl font-bold text-slate-800">爱的延续</span>
          </div>
          <nav className="hidden md:flex gap-6 text-slate-600 text-sm">
            <a href="#documents" className="hover:text-amber-600 transition">文书类型</a>
            <a href="#pricing" className="hover:text-amber-600 transition">定价</a>
            <a href="#about" className="hover:text-amber-600 transition">关于</a>
            <a href={H5_SITE} className="hover:text-amber-600 transition" target="_blank" rel="noopener noreferrer">
              移动端
            </a>
          </nav>
          <Link
            href="/questionnaire"
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            立即开始
          </Link>
        </div>
      </header>

      {/* Hero区域 */}
      <section className="hero-section">
        <div className="max-w-4xl mx-auto">
          <div className="trust-badge mb-6 inline-flex">
            <span>🛡️</span>
            <span>专业资产规划团队 | 数据加密保护</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            保护您的财富<br />传承您的爱
          </h1>
          <p className="text-xl text-slate-200 mb-8 max-w-2xl mx-auto">
            AI智能生成各类法律文书：婚姻协议、婚内财产约定、离婚协议、遗嘱等。
            资产规划专业人士把关，让您的意愿得到妥善安排。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/questionnaire" className="btn-primary">
              开始创建文书 · ¥19.9起
            </Link>
            <a href="#documents" className="btn-secondary" style={{ background: 'transparent', border: '2px solid white', color: 'white' }}>
              查看全部类型
            </a>
          </div>
        </div>
      </section>

      {/* 文书类型选择 */}
      <section id="documents" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4 text-slate-800">选择您的文书类型</h2>
          <p className="text-slate-600 text-center mb-12">覆盖婚姻家庭各类法律文书需求</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DOCUMENT_TYPES.map((doc) => {
              const colors = colorClasses[doc.color];
              return (
                <Link
                  key={doc.id}
                  href={`/questionnaire?type=${doc.id}`}
                  className={`${colors.bg} ${colors.border} border-2 rounded-2xl p-6 transition-all duration-200 ${colors.hover} group`}
                >
                  <div className={`w-14 h-14 ${colors.icon} rounded-xl flex items-center justify-center text-2xl mb-4`}>
                    {doc.icon}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-amber-600 transition-colors">
                    {doc.name}
                  </h3>
                  <p className="text-slate-600 text-sm mb-4">{doc.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-amber-600 font-semibold">¥{doc.price}</span>
                    <span className="text-slate-400 text-sm group-hover:translate-x-1 transition-transform">
                      开始填写 →
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
          <h2 className="text-3xl font-bold text-center mb-4 text-slate-800">简单四步，完成文书</h2>
          <p className="text-slate-600 text-center mb-12">全程在线操作，无需到场排队</p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="flow-step">
              <div className="step-number">1</div>
              <div>
                <h3 className="font-semibold text-lg mb-2">选择文书类型</h3>
                <p className="text-slate-600 text-sm">根据您的需求选择对应的法律文书类型</p>
              </div>
            </div>
            <div className="flow-step">
              <div className="step-number">2</div>
              <div>
                <h3 className="font-semibold text-lg mb-2">填写问卷</h3>
                <p className="text-slate-600 text-sm">回答相关问题，AI实时理解您的需求</p>
              </div>
            </div>
            <div className="flow-step">
              <div className="step-number">3</div>
              <div>
                <h3 className="font-semibold text-lg mb-2">AI生成草稿</h3>
                <p className="text-slate-600 text-sm">基于您的回答，AI即时生成文书草稿</p>
              </div>
            </div>
            <div className="flow-step">
              <div className="step-number">4</div>
              <div>
                <h3 className="font-semibold text-lg mb-2">付费下载</h3>
                <p className="text-slate-600 text-sm">支付后即可下载PDF/Word文件</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 定价方案 */}
      <section id="pricing" className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4 text-slate-800">透明定价</h2>
          <p className="text-slate-600 text-center mb-12">根据您的需求选择合适的服务方案</p>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* AI智能版 */}
            <div className="pricing-card">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2">{PRICING.aiGuide.name}</h3>
                {PRICING.aiGuide.promoText && (
                  <span className="inline-block bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full mb-2">{PRICING.aiGuide.promoText}</span>
                )}
                <p className="text-slate-600 text-sm mb-4">{PRICING.aiGuide.description}</p>
                <div className="text-4xl font-bold text-slate-800">
                  ¥{PRICING.aiGuide.price}
                </div>
              </div>
              <ul className="space-y-3 mb-6 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  AI问卷引导
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  文书草稿生成
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  PDF文件导出
                </li>
                <li className="flex items-center gap-2 text-slate-400">
                  <span>✗</span>
                  专家审核（需另付费）
                </li>
              </ul>
              <Link href="/questionnaire?plan=ai" className="block text-center bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 rounded-lg transition">
                立即开始
              </Link>
            </div>

            {/* 专家护航版 */}
            <div className="pricing-card featured">
              <div className="text-center mb-6">
                <div className="inline-block bg-amber-500 text-white text-xs px-2 py-1 rounded-full mb-2">推荐</div>
                <h3 className="text-xl font-bold mb-2">{PRICING.expertReview.name}</h3>
                <p className="text-slate-600 text-sm mb-4">{PRICING.expertReview.description}</p>
                <div className="text-4xl font-bold text-amber-600">
                  ¥{PRICING.expertReview.price}
                </div>
              </div>
              <ul className="space-y-3 mb-6 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  AI问卷引导
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  文书草稿生成
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  资产规划专业人士视频审核
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  签署指引文档
                </li>
              </ul>
              <Link href="/questionnaire?plan=expert" className="block text-center bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-lg transition">
                立即开始
              </Link>
            </div>
          </div>

          <p className="text-center text-slate-500 text-sm mt-8">
            <a href={H5_SITE} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
              手机访问移动端 →
            </a>
          </p>
        </div>
      </section>

      {/* 常见问题 */}
      <section id="faq" className="py-16 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-slate-800">常见问题</h2>

          <div className="space-y-6">
            <details className="bg-white rounded-lg p-6 shadow-sm">
              <summary className="font-semibold text-lg cursor-pointer">生成的文书有法律效力吗？</summary>
              <p className="mt-4 text-slate-600">
                AI生成的仅为草稿模板，需经当事人签字或公证后才具备法律效力。
                我们建议重要文书（如房产赠与、离婚协议等）完成公证以确保最大法律效力。
              </p>
            </details>

            <details className="bg-white rounded-lg p-6 shadow-sm">
              <summary className="font-semibold text-lg cursor-pointer">我的信息是否安全？</summary>
              <p className="mt-4 text-slate-600">
                我们采用银行级加密存储，所有数据仅用于生成文书，不会泄露给第三方。
                文书内容仅保存在您自己的设备和我们安全的服务器上。
              </p>
            </details>

            <details className="bg-white rounded-lg p-6 shadow-sm">
              <summary className="font-semibold text-lg cursor-pointer">如何修改已生成的文书？</summary>
              <p className="mt-4 text-slate-600">
                在支付前，您可以无限次重新填写问卷并生成新草稿。
                支付后如需修改，可联系客服或重新购买生成服务。
              </p>
            </details>

            <details className="bg-white rounded-lg p-6 shadow-sm">
              <summary className="font-semibold text-lg cursor-pointer">支持哪些文件格式下载？</summary>
              <p className="mt-4 text-slate-600">
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
          <p className="text-slate-500 text-sm">
            本平台仅提供文书模板智能生成参考，不构成法律专业意见，所有文书仅供个人参考使用
          </p>
        </div>
      </div>
    </div>
  );
}
