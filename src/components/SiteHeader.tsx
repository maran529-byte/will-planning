import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { HeaderAuthButtons } from "@/components/HeaderAuthButtons";

const H5_SITE = "https://h5.aiwill-planner.cn";

/**
 * SiteHeader - 主站导航
 *
 * 改版 v3 (2026-07-30, 修复"按钮没反应"问题):
 *   - 旧 v2: 「我的」「登录」「注册」全部直接跳 H5 (h5.aiwill-planner.cn/...)
 *     → H5 站点偶发不可达时, 用户点了等于跳到无法访问的页面 → 视觉上"按钮没反应"
 *   - 新 v3: 「我的」跳 /dashboard (主站 host-aware 页: 主站显示跳转卡, H5 显示真实页面)
 *     「登录」「注册」跳 /login /register (同上)
 *   - 架构要求: 主站 0 form 0 input 0 /api/* 调用 — 仍由 host-aware 渲染保证
 *   - 架构要求文档: /Users/maran/Desktop/架构要求.md
 */
export function SiteHeader() {
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
          <Link
            href="/overseas"
            className="hover:text-amber-600 transition inline-flex items-center gap-1"
          >
            <span aria-hidden>🌏</span>
            海外华人
          </Link>
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
          <Link
            href="/dashboard"
            className="text-slate-600 hover:text-amber-600 text-sm font-medium transition px-3 py-2"
          >
            我的
          </Link>
          <HeaderAuthButtons />
        </div>
      </div>
    </header>
  );
}
