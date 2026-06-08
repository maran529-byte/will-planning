'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 退出登录按钮
 * 调 DELETE /api/auth/login 清 cookie, 然后跳首页
 */
export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/auth/login', { method: 'DELETE' });
      router.push('/');
      router.refresh();
    } catch {
      // 即使失败也跳首页 (cookie 可能已清)
      router.push('/');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={busy}
      className="text-sm text-slate-500 hover:text-red-600 transition disabled:opacity-50"
    >
      {busy ? '退出中...' : '退出登录'}
    </button>
  );
}
