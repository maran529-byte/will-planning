import Link from 'next/link'
import Footer from '../../components/Footer'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="px-4 h-14 flex items-center">
          <span className="text-red-500 font-bold text-lg">aiwill-planner</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">登录</h1>
            <p className="text-gray-500 text-sm">合规契约生成平台</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                <input
                  type="tel"
                  placeholder="请输入手机号"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">验证码</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="请输入验证码"
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-red-500"
                  />
                  <button className="px-4 py-3 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                    获取验证码
                  </button>
                </div>
              </div>
              <button className="w-full bg-red-500 text-white py-3 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
                登录
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            登录即表示同意《用户协议》和《隐私政策》
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
