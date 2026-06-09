'use client';

/**
 * /admin/(authed)/* 退出登录按钮
 *
 * 单独的 client component (因为含 onClick + window.location)
 * layout.tsx 是 server component, 不能直接写 onClick
 *
 * 改版 v2 (2026-06-09, 拆出):
 *   - 从 layout.tsx 拆出, 修 "Event handlers cannot be passed to Client Component props"
 *   - 加 focus-ring-visible, aria-label 保留
 */

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch('/api/admin/auth', { method: 'DELETE' });
        window.location.href = '/admin/login';
      }}
      className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded hover:bg-slate-800 focus-ring-visible"
      aria-label="退出登录"
    >
      退出
    </button>
  );
}
