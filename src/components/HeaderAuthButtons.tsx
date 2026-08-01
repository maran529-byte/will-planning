/**
 * HeaderAuthButtons - SiteHeader 的登录/注册按钮
 *
 * 改版 v3 (2026-07-30, 修复"按钮没反应"问题):
 *   - 旧 v2 (2026-07-22): 直接跳 H5 (h5.aiwill-planner.cn/{login,register})
 *     → H5 站点 SSL/网络偶发不可达时, 用户点了等于跳到无法访问的页面 → 视觉上"按钮没反应"
 *   - 新 v3: 链接到主站相对路径 /login 和 /register
 *     → 主站 /login /register 本身是 host-aware 渲染: 主站 host 显示"前往 H5 登录/注册"卡
 *     → H5 host 显示真实表单 (走动态路由)
 *     → 不依赖 H5 站点的可达性即可看到反馈
 *   - 架构要求: 主站 0 form 0 input 0 /api/* 调用 — 仍由 host-aware 渲染保证
 *   - 架构要求文档: /Users/maran/Desktop/架构要求.md
 */

import Link from 'next/link';

export function HeaderAuthButtons({
  initialIntent = 'login',
}: {
  initialIntent?: 'login' | 'register';
}) {
  const loginHref = '/login';
  const registerHref = '/register';

  return (
    <div className="flex items-center gap-2">
      <Link
        href={loginHref}
        className="border-2 border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
      >
        登录
      </Link>
      <Link
        href={registerHref}
        className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm"
      >
        注册
      </Link>
    </div>
  );
}
