import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { HeaderAuthButtons } from "@/components/HeaderAuthButtons";
import { readUserSession } from "@/lib/user-auth";

const H5_SITE = "https://h5.aiwill-planner.cn";

export async function SiteHeader() {
  const session = await readUserSession();
  const isLoggedIn = !!session;

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <BrandLogo size="md" />
        </div>
        <nav
          className="hidden md:flex gap-6 text-slate-600 text-sm items-center"
          aria-label="主导航"
        >
          <Link href="/doc-type" className="hover:text-amber-600 transition">
            文书类型
          </Link>
          <Link href="/#pricing" className="hover:text-amber-600 transition">
            定价
          </Link>
          <Link href="/knowledge" className="hover:text-amber-600 transition">
            知识中心
          </Link>
          <Link href="/methodology" className="hover:text-amber-600 transition">
            方法论
          </Link>
          <Link href="/affiliate" className="hover:text-amber-600 transition">
            博主计划
          </Link>
          {/* deploy-fix 审计: 增加「成为博主」CTA, 提高 affiliate 入口转化 */}
          <Link
            href="/affiliate"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition leading-tight-cn"
          >
            成为博主
          </Link>
          <a
            href={H5_SITE}
            className="hover:text-amber-600 transition inline-flex items-center gap-1"
            target="_blank"
            rel="noopener noreferrer"
          >
            移动端
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </nav>
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="text-slate-600 hover:text-amber-600 text-sm font-medium transition px-3 py-2"
            >
              我的
            </Link>
          ) : (
            <HeaderAuthButtons />
          )}
        </div>
      </div>
    </header>
  );
}
