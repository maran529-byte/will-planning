import Link from 'next/link'
import Footer from '../components/Footer'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-red-500 font-bold text-lg">aiwill-planner</span>
          </div>
          <button className="text-sm text-gray-600">退出</button>
        </div>
      </header>

      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around items-center h-16">
          <Link href="/dashboard" className="flex flex-col items-center gap-0.5 text-red-500">
            <span className="text-lg">🏠</span>
            <span className="text-xs">首页</span>
          </Link>
          <Link href="/dashboard/contracts" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-red-500">
            <span className="text-lg">📋</span>
            <span className="text-xs">契约</span>
          </Link>
          <Link href="/dashboard/create" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-red-500">
            <span className="text-lg">➕</span>
            <span className="text-xs">创建</span>
          </Link>
          <Link href="/dashboard/templates" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-red-500">
            <span className="text-lg">📁</span>
            <span className="text-xs">模板</span>
          </Link>
        </div>
      </nav>

      <Footer />
    </div>
  )
}
