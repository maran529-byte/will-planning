export default function SettingsPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-lg font-semibold text-gray-800 mb-4">设置</h1>

      <div className="space-y-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-800 mb-3">账号信息</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">手机号</span>
              <span className="text-sm text-gray-800">189****1234</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">注册时间</span>
              <span className="text-sm text-gray-800">2026-05-01</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-800 mb-3">关于</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">版本</span>
              <span className="text-sm text-gray-800">v0.1.0</span>
            </div>
            <div className="flex justify-between items-center">
              <a href="/faq" className="text-sm text-red-500 hover:text-red-600">查看法律免责声明</a>
            </div>
          </div>
        </div>

        <button className="w-full py-3 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50">
          退出登录
        </button>
      </div>
    </div>
  )
}
