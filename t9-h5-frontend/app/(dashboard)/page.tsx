import Link from 'next/link'

export default function DashboardHomePage() {
  return (
    <div className="px-4 py-6">
      {/* Welcome Card */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h2 className="text-base font-semibold text-gray-800">欢迎回来</h2>
        <p className="text-sm text-gray-500 mt-1">2026年5月30日</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Link href="/dashboard/create" className="bg-white rounded-xl p-3 shadow-sm flex flex-col items-center gap-1">
          <span className="text-xl">📝</span>
          <span className="text-xs text-gray-600">创建契约</span>
        </Link>
        <Link href="/dashboard/contracts" className="bg-white rounded-xl p-3 shadow-sm flex flex-col items-center gap-1">
          <span className="text-xl">📋</span>
          <span className="text-xs text-gray-600">契约列表</span>
        </Link>
        <Link href="/dashboard/templates" className="bg-white rounded-xl p-3 shadow-sm flex flex-col items-center gap-1">
          <span className="text-xl">📁</span>
          <span className="text-xs text-gray-600">模板中心</span>
        </Link>
        <Link href="/faq" className="bg-white rounded-xl p-3 shadow-sm flex flex-col items-center gap-1">
          <span className="text-xl">✅</span>
          <span className="text-xs text-gray-600">合规检测</span>
        </Link>
      </div>

      {/* Recent Contracts */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">最近契约</h3>
        <div className="space-y-3">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-800">我的遗嘱</h4>
                <p className="text-xs text-gray-500 mt-0.5">2026-05-29 创建</p>
              </div>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">待签署</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">统计数据</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-xl font-bold text-gray-800">0</p>
            <p className="text-xs text-gray-500">待签署</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-xl font-bold text-gray-800">0</p>
            <p className="text-xs text-gray-500">已签署</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-xl font-bold text-gray-800">1</p>
            <p className="text-xs text-gray-500">草稿</p>
          </div>
        </div>
      </div>
    </div>
  )
}
