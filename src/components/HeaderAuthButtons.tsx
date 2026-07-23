/**
 * HeaderAuthButtons - SiteHeader 的登录/注册按钮
 *
 * 改版 v2 (2026-07-22, 方案 A 合规修复):
 *   - 旧: 点击触发 LoginForm Modal (调 /api/auth/login 4 个 API, 严重 ICP 违规)
 *   - 新: 直接跳 H5 (h5.aiwill-planner.cn/login), 主站 0 form 0 input 0 api
 *   - 架构要求文档: /Users/maran/Desktop/架构要求.md
 */

import Link from 'next/link';

const H5_LOGIN = 'https://h5.aiwill-planner.cn/login';
const H5_REGISTER = 'https://h5.aiwill-planner.cn/register';

export function HeaderAuthButtons({
  initialIntent = 'login',
}: {
  initialIntent?: 'login' | 'register';
}) {
  const loginHref = H5_LOGIN;
  const registerHref = H5_REGISTER;

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
