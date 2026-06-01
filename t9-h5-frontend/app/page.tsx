import Footer from './components/Footer'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-red-500 font-bold text-lg">aiwill-planner</span>
          </div>
          <nav className="flex items-center gap-4">
            <a href="/login" className="text-sm text-gray-600 hover:text-red-500">登录</a>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-red-50 to-white py-12 px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">爱的延续</h1>
          <p className="text-gray-500 mb-6">专业婚姻文书在线生成</p>
          <a
            href="/login"
            className="inline-block bg-red-500 text-white px-8 py-3 rounded-full text-base font-medium hover:bg-red-600 transition-colors"
          >
            开始使用
          </a>
        </section>

        {/* Features */}
        <section className="py-10 px-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center">服务介绍</h2>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl mb-2">📋</div>
              <h3 className="font-medium text-sm text-gray-800">契约生成</h3>
              <p className="text-xs text-gray-500 mt-1">智能生成各类婚姻文书</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl mb-2">✅</div>
              <h3 className="font-medium text-sm text-gray-800">合规检测</h3>
              <p className="text-xs text-gray-500 mt-1">自动检测文书合规性</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl mb-2">📁</div>
              <h3 className="font-medium text-sm text-gray-800">模板中心</h3>
              <p className="text-xs text-gray-500 mt-1">丰富的文书模板库</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl mb-2">📱</div>
              <h3 className="font-medium text-sm text-gray-800">移动端适配</h3>
              <p className="text-xs text-gray-500 mt-1">随时随地管理文书</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-10 px-4 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center">常见问题</h2>
          <div className="space-y-3 max-w-md mx-auto">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-medium text-sm text-gray-800">生成的文书具有法律效力吗？</h3>
              <p className="text-xs text-gray-500 mt-1">生成的文书为参考模板，具体法律效力需根据实际情况及当地法律要求确定，建议必要时咨询专业律师。</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-medium text-sm text-gray-800">我的信息是否安全？</h3>
              <p className="text-xs text-gray-500 mt-1">所有信息仅用于文书生成，我们高度重视用户隐私保护，不对外泄露任何个人信息。</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
