import Link from 'next/link'

export default function ContractsPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-lg font-semibold text-gray-800 mb-4">契约列表</h1>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {['全部', '草稿', '待签', '已签', '已拒绝'].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
              tab === '全部'
                ? 'bg-red-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Contract List */}
      <div className="space-y-3">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-800">我的遗嘱</h3>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">待签署</span>
          </div>
          <p className="text-xs text-gray-500 mb-2">签约方：张三、李四</p>
          <p className="text-xs text-gray-400">创建时间：2026-05-29</p>
        </div>
      </div>

      {/* FAB */}
      <Link
        href="/dashboard/create"
        className="fixed bottom-20 right-4 w-12 h-12 bg-red-500 text-white rounded-full shadow-lg flex items-center justify-center text-xl"
      >
        +
      </Link>
    </div>
  )
}
