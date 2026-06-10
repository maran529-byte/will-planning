/**
 * Dashboard 顶部 nav 栏
 * 简单版: logo + 当前用户邮箱 + 退出按钮
 */
import Link from 'next/link';
import type { SessionUser } from '@/lib/user-auth';
import { BrandLogo } from '@/components/BrandLogo';

interface UserNavBarProps {
  user: SessionUser;
}

export function UserNavBar({ user }: UserNavBarProps) {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 text-slate-800 hover:text-amber-600 transition">
          <BrandLogo size="sm" />
          <span className="text-xs text-slate-400 hidden sm:inline">/ 我的</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 hidden sm:inline truncate max-w-[200px]">
            {user.email}
          </span>
          <Link
            href="/doc-type"
            className="text-sm text-slate-600 hover:text-amber-600 transition hidden sm:inline"
          >
            创建文书
          </Link>
          <Link
            href="/orders"
            className="text-sm text-slate-600 hover:text-amber-600 transition hidden sm:inline"
          >
            订单
          </Link>
          <span className="text-sm text-slate-300 hidden sm:inline">|</span>
          <span className="text-xs text-slate-500">← 退出见下方</span>
        </div>
      </div>
    </header>
  );
}
