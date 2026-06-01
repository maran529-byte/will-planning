import Link from 'next/link'

export default function CreateContractPage() {
  return (
    <div className="px-4 py-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-6">
        {['1. 基础', '2. 条款', '3. 签约方', '4. 确认'].map((step, idx) => (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                idx === 0
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {idx + 1}
            </div>
            <span className={`text-xs hidden sm:block ${idx === 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {step}
            </span>
            {idx < 3 && <div className="w-4 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">基础信息</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">契约名称</label>
            <input
              type="text"
              placeholder="请输入契约名称"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">契约类型</label>
            <select className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-red-500 bg-white">
              <option>自书遗嘱</option>
              <option>婚前财产协议</option>
              <option>婚姻关系协议</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">有效期</label>
            <input
              type="date"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-red-500"
            />
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-20 left-0 right-0 bg-white px-4 py-4 z-50">
        <div className="flex gap-3">
          <button className="flex-1 py-3 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            保存草稿
          </button>
          <button className="flex-1 py-3 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">
            下一步
          </button>
        </div>
      </div>
    </div>
  )
}
