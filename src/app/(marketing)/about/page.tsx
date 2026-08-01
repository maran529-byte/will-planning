import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '关于我们 - 家有所爱智能家庭财产规划平台',
  description: '家有所爱是一家专注于婚前协议、婚内财产协议、离婚协议、子女抚养协议、赠与协议等家庭文书智能生成的综合家庭财产规划平台。我们致力于帮助中国家庭从容规划重要事务，传递爱与责任。',
  keywords: '家庭财产规划、婚前协议、婚内协议、离婚协议、子女抚养协议、赠与协议、家庭文书智能生成',
  alternates: {
    canonical: 'https://aiwill-planner.cn/about',
    languages: {
      'zh-CN': 'https://aiwill-planner.cn/about',
      'zh-HK': 'https://aiwill-planner.cn/about',
      'x-default': 'https://aiwill-planner.cn/about',
    },
  },
  openGraph: {
    title: '关于我们 - 家有所爱智能家庭财产规划平台',
    description: '帮助中国家庭从容规划婚前财产、婚内财产、离婚抚养、赠与继承等重要事务，传递爱与责任。',
    type: 'website',
    url: 'https://aiwill-planner.cn/about',
    images: [
      {
        url: '/og/about.png',
        width: 1200,
        height: 630,
        alt: '家有所爱 · 关于我们',
      },
    ],
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Hero Section */}
      <section className="relative py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
            家有所爱
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            综合家庭财产规划智能平台
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            婚前财产、婚内财产分配、离婚子女抚养、父母赠与……<br />
            每个中国家庭都可能面临这些重要时刻。<br />
            我们相信，提前做好规划，是对家人最负责的爱。
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
            我们的使命
          </h2>
          <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-8">
            <p className="text-lg text-gray-700 leading-relaxed">
              家有所爱的诞生，源于一个朴素的愿望：让每一个中国家庭都能从容面对人生中的重要时刻。
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mt-4">
              婚前财产如何约定？婚内财产怎样分配更公平？离婚时子女抚养权如何保障？父母想把财产赠与子女怎样最稳妥？……这些都是中国家庭真实面临的课题。
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mt-4">
              我们致力于提供便捷的家庭文书智能生成服务，帮助每个家庭在重要时刻做出清晰、负责任的安排，传递爱与安心。
            </p>
          </div>
        </div>
      </section>

      {/* Why We Do This */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
            我们为什么做这件事
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-amber-400">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                中国家庭的真实困境
              </h3>
              <p className="text-gray-600">
                中国家庭面临婚前财产、婚内财产分配、离婚子女抚养、父母赠与等复杂场景。很多家庭因为缺乏清晰的规划，导致矛盾与纠纷。我们希望用技术力量，让规划变得更简单。
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-400">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                提前做好家庭财产规划，是对家人最负责的爱
              </h3>
              <p className="text-gray-600">
                我们见过太多家庭因为未提前规划，在关键时刻陷入被动。家有所爱希望帮助每一个家庭从容规划重要事务，让爱与责任得以安心传承。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Advantages */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
            我们的优势
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6">
              <div className="w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                智能便捷
              </h3>
              <p className="text-gray-600">
                多年深耕家庭财产规划领域，我们深刻理解中国家庭的多样需求。基于《民法典》相关条款，提供贴合实际场景的家庭文书智能生成服务。
              </p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6">
              <div className="w-12 h-12 bg-orange-400 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                专业可靠
              </h3>
              <p className="text-gray-600">
                我们与资深资产规划专业人士合作，确保文书内容严谨合规。同时支持根据需求选择专业公证服务，多一层保障。
              </p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6">
              <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                隐私安全
              </h3>
              <p className="text-gray-600">
                您的数据仅用于文书生成，我们采用加密技术保护隐私，无需担心信息泄露。所有数据处理符合安全标准。
              </p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                温暖陪伴
              </h3>
              <p className="text-gray-600">
                从婚前到婚内，从离婚到赠与……人生的每个重要时刻，我们都想与您同行。让规划变得简单，让爱与责任得以传承。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Don't Do */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
            我们不做什么
          </h2>
          <div className="bg-white rounded-xl shadow-sm p-8">
            <ul className="space-y-4">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mr-3 mt-1">
                  <span className="text-red-500 text-sm">✕</span>
                </span>
                <p className="text-gray-600">
                  <strong>复杂家庭关系（如再婚、跨境资产、家族信托）建议咨询专业资产规划人员。</strong> 我们提供的是标准化家庭文书智能生成服务，复杂情况需要专业个案处理。
                </p>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mr-3 mt-1">
                  <span className="text-red-500 text-sm">✕</span>
                </span>
                <p className="text-gray-600">
                  <strong>我们不提供法律诉讼服务。</strong> 如进入法律程序，请寻求专业律师协助。
                </p>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mr-3 mt-1">
                  <span className="text-red-500 text-sm">✕</span>
                </span>
                <p className="text-gray-600">
                  <strong>我们不能替代公证文书。</strong> 如需公证，请到当地公证机构办理。我们的文书生成服务可作为前期规划参考。
                </p>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
            发展历程
          </h2>
          <div className="relative">
            <div className="absolute left-4 md:left-1/2 transform md:-translate-x-px h-full w-0.5 bg-amber-200"></div>
            <div className="space-y-8">
              <div className="relative flex items-center md:justify-between">
                <div className="flex-1 md:pr-8 md:text-right">
                  <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl p-6 inline-block">
                    <span className="text-amber-600 font-semibold">2026-03</span>
                    <h3 className="text-lg font-semibold text-gray-800 mt-2">
                      家有所爱平台启动
                    </h3>
                    <p className="text-gray-600 mt-1">
                      提供家庭文书智能生成服务，帮助中国家庭从容规划重要事务
                    </p>
                  </div>
                </div>
                <div className="absolute left-4 md:left-1/2 transform md:-translate-x-1/2 w-4 h-4 bg-amber-400 rounded-full border-2 border-white shadow"></div>
                <div className="flex-1 md:pl-8 hidden md:block"></div>
              </div>
              <div className="relative flex items-center md:justify-between">
                <div className="flex-1 md:pr-8 hidden md:block"></div>
                <div className="absolute left-4 md:left-1/2 transform md:-translate-x-1/2 w-4 h-4 bg-amber-400 rounded-full border-2 border-white shadow"></div>
                <div className="flex-1 md:pl-8">
                  <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl p-6 inline-block">
                    <span className="text-amber-600 font-semibold">2026-05</span>
                    <h3 className="text-lg font-semibold text-gray-800 mt-2">
                      服务升级
                    </h3>
                    <p className="text-gray-600 mt-1">
                      支持更多家庭文书类型，覆盖婚前、婚内、离婚、抚养、赠与等场景
                    </p>
                  </div>
                </div>
              </div>
              <div className="relative flex items-center md:justify-between">
                <div className="flex-1 md:pr-8 md:text-right">
                  <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl p-6 inline-block">
                    <span className="text-amber-600 font-semibold">2026-07</span>
                    <h3 className="text-lg font-semibold text-gray-800 mt-2">
                      专业合作
                    </h3>
                    <p className="text-gray-600 mt-1">
                      与资深资产规划专业人士建立合作，提供更专业的服务支持
                    </p>
                  </div>
                </div>
                <div className="absolute left-4 md:left-1/2 transform md:-translate-x-1/2 w-4 h-4 bg-amber-400 rounded-full border-2 border-white shadow"></div>
                <div className="flex-1 md:pl-8 hidden md:block"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 用户口碑 (改版 v11, 2026-07-02): 关于页同步展示 4 条 testimonial, 与首页呼应 */}
      <section className="py-16 px-4 bg-amber-50/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
            用户口碑
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
              <p className="text-gray-700 leading-relaxed mb-4">
                <span className="text-amber-500 text-2xl mr-1" aria-hidden>“</span>
                用了家有所爱的婚前协议模板, 30 分钟搞定, 比找律师方便多了。
              </p>
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">小 W</span> · 准新娘 · 来自上海
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
              <p className="text-gray-700 leading-relaxed mb-4">
                <span className="text-amber-500 text-2xl mr-1" aria-hidden>“</span>
                离婚冷静期期间很焦虑, 家有所爱的离婚协议模板把财产 / 孩子都理清了, 心里有底。
              </p>
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">小 L</span> · 二胎妈妈 · 来自北京
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
              <p className="text-gray-700 leading-relaxed mb-4">
                <span className="text-amber-500 text-2xl mr-1" aria-hidden>“</span>
                再婚家庭搞股权赠与协议, 系统化生成把赠与人 / 受赠人 / 税费条款都理得很清楚。
              </p>
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">老陈</span> · 创业者 · 来自深圳
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
              <p className="text-gray-700 leading-relaxed mb-4">
                <span className="text-amber-500 text-2xl mr-1" aria-hidden>“</span>
                婚内财产协议让我和先生关系反而更坦诚, 推荐同龄人。
              </p>
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">小 S</span> · 全职太太 · 来自成都
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-2xl font-bold mb-2">家有所爱</p>
          <p className="text-gray-400">综合家庭财产规划智能平台</p>
          <p className="text-gray-500 text-sm mt-4">
            © 2026 家有所爱. 用爱与责任，守护每一个家庭。
          </p>
        </div>
      </footer>
    </div>
  );
}
