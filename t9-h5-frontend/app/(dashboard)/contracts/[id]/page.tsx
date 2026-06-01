import Link from 'next/link'
import Footer from '../../../components/Footer'

export default function ContractDetailPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard/contracts" className="text-gray-600">
            ← 返回
          </Link>
          <span className="font-medium text-gray-800">契约详情</span>
          <button className="text-gray-400">...</button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        {/* Status Banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-full">待签署</span>
            <span className="text-sm text-gray-600">请尽快完成签署</span>
          </div>
        </div>

        {/* Contract Info */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h2 className="text-base font-semibold text-gray-800 mb-3">基本信息</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">契约名称</span>
              <span className="text-gray-800">我的遗嘱</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">契约类型</span>
              <span className="text-gray-800">自书遗嘱</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">创建时间</span>
              <span className="text-gray-800">2026-05-29</span>
            </div>
          </div>
        </div>

        {/* Signatories */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h2 className="text-base font-semibold text-gray-800 mb-3">签约方</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">张三</p>
                <p className="text-xs text-gray-500">189xxxx1234</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">已签署</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">李四</p>
                <p className="text-xs text-gray-500">138xxxx5678</p>
              </div>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">待签署</span>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 z-50">
        <div className="flex gap-3">
          <button className="flex-1 py-3 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            下载 PDF
          </button>
          <button className="flex-1 py-3 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">
            签署
          </button>
        </div>
      </div>
    </div>
  )
}
