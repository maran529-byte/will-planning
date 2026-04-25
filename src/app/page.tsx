import Link from "next/link";
import { PRICING } from "@/lib/config";

export default function HomePage() {
  return (
    <div className="landing-page">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚖️</span>
            <span className="text-xl font-bold text-slate-800">传承家</span>
          </div>
          <nav className="hidden md:flex gap-6 text-slate-600">
            <a href="#pricing" className="hover:text-amber-600 transition">定价</a>
            <a href="#process" className="hover:text-amber-600 transition">流程</a>
            <a href="#about" className="hover:text-amber-600 transition">关于</a>
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
            <span>专业律师团队审核 | 数据加密保护</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            保护您的财富<br />传承您的爱
          </h1>
          <p className="text-xl text-slate-200 mb-8 max-w-2xl mx-auto">
            传承家为您提供专业的遗嘱规划服务。AI辅助生成草稿，专业律师审核把关，
            让您的意愿得到妥善安排，给家人一份安心。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/questionnaire" className="btn-primary">
              开始创建遗嘱 · ¥19.9起
            </Link>
            <a href="#process" className="btn-secondary" style={{ background: 'transparent', border: '2px solid white', color: 'white' }}>
              了解更多
            </a>
          </div>
        </div>
      </section>

      {/* 服务流程 */}
      <section id="process" className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4 text-slate-800">简单四步，完成遗嘱规划</h2>
          <p className="text-slate-600 text-center mb-12">全程在线操作，无需到场排队</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flow-step">
              <div className="step-number">1</div>
              <div>
                <h3 className="font-semibold text-lg mb-2">填写问卷</h3>
                <p className="text-slate-600 text-sm">回答25个问题，涵盖财产、家庭、医疗等各个方面</p>
              </div>
            </div>
            <div className="flow-step">
              <div className="step-number">2</div>
              <div>
                <h3 className="font-semibold text-lg mb-2">AI生成草稿</h3>
                <p className="text-slate-600 text-sm">基于您的回答，AI即时生成遗嘱草稿</p>
              </div>
            </div>
            <div className="flow-step">
              <div className="step-number">3</div>
              <div>
                <h3 className="font-semibold text-lg mb-2">律师审核</h3>
                <p className="text-slate-600 text-sm">专业律师1对1审核，确保法律效力</p>
              </div>
            </div>
            <div className="flow-step">
              <div className="step-number">4</div>
              <div>
                <h3 className="font-semibold text-lg mb-2">正式签署</h3>
                <p className="text-slate-600 text-sm">线上视频见证 or 线下公证处，完成签署</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 定价方案 */}
      <section id="pricing" className="py-16 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4 text-slate-800">透明定价</h2>
          <p className="text-slate-600 text-center mb-12">根据您的需求选择合适的服务方案</p>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* AI引导版 */}
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
                  25题AI问卷引导
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  遗嘱草稿生成
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  PDF文件导出
                </li>
                <li className="flex items-center gap-2 text-slate-400">
                  <span>✗</span>
                  律师审核（需另付费）
                </li>
              </ul>
              <Link href="/questionnaire?plan=ai" className="block text-center bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 rounded-lg transition">
                立即开始
              </Link>
            </div>

            {/* 律师审核版 */}
            <div className="pricing-card featured">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2">{PRICING.lawyerReview.name}</h3>
                <p className="text-slate-600 text-sm mb-4">{PRICING.lawyerReview.description}</p>
                <div className="text-4xl font-bold text-amber-600">
                  ¥{PRICING.lawyerReview.price}
                </div>
              </div>
              <ul className="space-y-3 mb-6 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  25题AI问卷引导
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  遗嘱草稿生成
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  专业律师视频审核
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  签署指引文档
                </li>
              </ul>
              <Link href="/questionnaire?plan=lawyer" className="block text-center bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-lg transition">
                立即开始
              </Link>
            </div>

            {/* 家族传承版 */}
            <div className="pricing-card">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2">{PRICING.familyHeritage.name}</h3>
                <p className="text-slate-600 text-sm mb-4">{PRICING.familyHeritage.description}</p>
                <div className="text-4xl font-bold text-slate-800">
                  ¥{PRICING.familyHeritage.price}
                  <span className="text-lg font-normal text-slate-500">/次</span>
                </div>
              </div>
              <ul className="space-y-3 mb-6 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  家族财富全面规划
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  年度律师顾问服务
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  家族信托方案设计
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  优先预约资深律师
                </li>
              </ul>
              <Link href="/questionnaire?plan=family" className="block text-center bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 rounded-lg transition">
                立即开始
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 常见问题 */}
      <section id="faq" className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-slate-800">常见问题</h2>
          
          <div className="space-y-6">
            <details className="bg-white rounded-lg p-6 shadow-sm">
              <summary className="font-semibold text-lg cursor-pointer">遗嘱一定要公证吗？</summary>
              <p className="mt-4 text-slate-600">
                自书遗嘱和代书遗嘱在符合法定条件时也具有法律效力，但公证遗嘱效力最高。
                传承家提供的服务包含公证指引，帮助您选择最适合的方式。
              </p>
            </details>
            
            <details className="bg-white rounded-lg p-6 shadow-sm">
              <summary className="font-semibold text-lg cursor-pointer">我的信息是否安全？</summary>
              <p className="mt-4 text-slate-600">
                我们采用银行级加密存储，所有数据仅用于生成遗嘱，不会泄露给第三方。
                律师也需签署保密协议。
              </p>
            </details>
            
            <details className="bg-white rounded-lg p-6 shadow-sm">
              <summary className="font-semibold text-lg cursor-pointer">AI生成的遗嘱有法律效力吗？</summary>
              <p className="mt-4 text-slate-600">
                AI生成的仅为草稿，需经律师审核并完成正式签署后才具备法律效力。
                我们强烈建议进行公证以确保最大法律效力。
              </p>
            </details>
            
            <details className="bg-white rounded-lg p-6 shadow-sm">
              <summary className="font-semibold text-lg cursor-pointer">如何修改已签署的遗嘱？</summary>
              <p className="mt-4 text-slate-600">
                遗嘱人可以随时修改或撤销遗嘱。传承家会员可在有效期内享受多次修改服务。
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="bg-slate-800 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-2xl">⚖️</span>
            <span className="text-xl font-bold">传承家</span>
          </div>
          <p className="text-slate-400 mb-6">
            专业律师团队 × AI辅助生成<br />
            让爱与财富安心传承
          </p>
          <p className="text-slate-500 text-sm">
            © 2024 传承家. 免责声明：本平台仅提供遗嘱规划辅助服务，不构成法律意见。
          </p>
        </div>
      </footer>
    </div>
  );
}
