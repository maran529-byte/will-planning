export default function TemplatesPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-lg font-semibold text-gray-800 mb-4">模板中心</h1>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {['全部', '遗嘱', '婚姻协议', '财产约定'].map((tab) => (
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

      {/* Template Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="bg-gray-100 rounded-lg h-24 mb-3 flex items-center justify-center">
            <span className="text-3xl">📋</span>
          </div>
          <h3 className="text-sm font-medium text-gray-800">自书遗嘱模板</h3>
          <p className="text-xs text-gray-500 mt-1">最常用的遗嘱格式</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="bg-gray-100 rounded-lg h-24 mb-3 flex items-center justify-center">
            <span className="text-3xl">💍</span>
          </div>
          <h3 className="text-sm font-medium text-gray-800">婚前财产协议</h3>
          <p className="text-xs text-gray-500 mt-1">明确财产归属</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="bg-gray-100 rounded-lg h-24 mb-3 flex items-center justify-center">
            <span className="text-3xl">🤝</span>
          </div>
          <h3 className="text-sm font-medium text-gray-800">婚姻关系协议</h3>
          <p className="text-xs text-gray-500 mt-1">婚后权利义务</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="bg-gray-100 rounded-lg h-24 mb-3 flex items-center justify-center">
            <span className="text-3xl">🏠</span>
          </div>
          <h3 className="text-sm font-medium text-gray-800">房产分配协议</h3>
          <p className="text-xs text-gray-500 mt-1">房产归属约定</p>
        </div>
      </div>
    </div>
  )
}
