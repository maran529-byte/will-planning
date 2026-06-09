import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase-server';
import { timeAgo, RoleBadge } from '@/lib/admin-helpers';

/**
 * /admin/users 用户列表
 *
 * 改版 v2 (2026-06-09):
 *   - 改用 @/lib/admin-helpers 共享 timeAgo / RoleBadge
 *   - 删除本地 timeAgo / RoleBadge (重复代码)
 *   - 添加 leading-tight-cn / leading-relaxed-cn / tabular-nums 排版
 *   - 表格加 aria-label + <th scope="col">
 *   - 表单 label 用 htmlFor 关联 + input 16px 防 iOS 放大
 *   - 数量 / 时间用 tabular-nums
 *   - 添加 pb-safe
 */

export const dynamic = 'force-dynamic';

interface UserRow {
  id: string;
  openid: string | null;
  email: string | null;
  display_name: string | null;
  wechat_nickname: string | null;
  phone: string | null;
  role: string;
  status: string | null;
  last_login_at: string | null;
  created_at: string;
}

async function loadUsers(searchParams: { role?: string; q?: string }) {
  if (!supabaseAdmin) return { users: [], total: 0 };
  let query = supabaseAdmin
    .from('users')
    .select('id, openid, email, display_name, wechat_nickname, phone, role, status, last_login_at, created_at', { count: 'exact' });
  if (searchParams.role) query = query.eq('role', searchParams.role);
  if (searchParams.q) {
    query = query.or(
      `openid.ilike.%${searchParams.q}%,email.ilike.%${searchParams.q}%,display_name.ilike.%${searchParams.q}%,wechat_nickname.ilike.%${searchParams.q}%,phone.ilike.%${searchParams.q}%`
    );
  }
  query = query.order('created_at', { ascending: false }).range(0, 99);
  const { data, count } = await query;
  return { users: (data || []) as UserRow[], total: count || 0 };
}

const ROLE_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'user', label: '用户' },
  { value: 'blogger', label: '博主' },
  { value: 'lawyer', label: '律师' },
  { value: 'admin', label: '管理员' },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const { users, total } = await loadUsers(sp);

  return (
    <div className="space-y-4 pb-safe">
      <h1 className="text-2xl font-bold text-slate-800 leading-tight-cn">
        <span aria-hidden>👥 </span>用户 (<span className="tabular-nums">{total}</span>)
      </h1>

      <form
        className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-end gap-3"
        aria-label="用户过滤"
      >
        <div>
          <label
            htmlFor="user-role"
            className="block text-xs text-slate-600 mb-1 leading-tight-cn"
          >
            角色
          </label>
          <select
            id="user-role"
            name="role"
            defaultValue={sp.role || ''}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm focus-ring-visible"
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="user-q"
            className="block text-xs text-slate-600 mb-1 leading-tight-cn"
          >
            搜索
          </label>
          <input
            id="user-q"
            name="q"
            defaultValue={sp.q || ''}
            placeholder="openid / 邮箱 / 昵称 / 手机"
            inputMode="search"
            // 改版 v2: 16px 防 iOS 自动放大
            style={{ fontSize: '16px' }}
            className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus-ring-visible"
          />
        </div>
        <button
          type="submit"
          className="rounded bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 text-sm font-medium focus-ring-visible leading-tight-cn"
        >
          过滤
        </button>
        {(sp.role || sp.q) && (
          <Link
            href="/admin/users"
            className="text-sm text-slate-500 hover:text-slate-700 focus-ring-visible"
          >
            清除
          </Link>
        )}
      </form>

      <div className="rounded-xl bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]" aria-label="用户列表">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th scope="col" className="px-4 py-2 text-left">openid</th>
              <th scope="col" className="px-4 py-2 text-left">昵称</th>
              <th scope="col" className="px-4 py-2 text-left">邮箱</th>
              <th scope="col" className="px-4 py-2 text-left">手机</th>
              <th scope="col" className="px-4 py-2 text-left">角色</th>
              <th scope="col" className="px-4 py-2 text-left">状态</th>
              <th scope="col" className="px-4 py-2 text-right">注册</th>
              <th scope="col" className="px-4 py-2 text-right">最近登录</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-slate-400 leading-relaxed-cn"
                >
                  暂无用户
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-xs text-slate-600 max-w-[150px] truncate">
                    {u.openid || '-'}
                  </td>
                  <td className="px-4 py-2 leading-tight-cn">
                    {u.display_name || u.wechat_nickname || '-'}
                  </td>
                  <td className="px-4 py-2 text-xs">{u.email || '-'}</td>
                  <td className="px-4 py-2 text-xs tabular-nums">
                    {u.phone || '-'}
                  </td>
                  <td className="px-4 py-2">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-2 text-xs leading-tight-cn">
                    {u.status || 'active'}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-slate-500 tabular-nums">
                    {timeAgo(u.created_at)}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-slate-500 tabular-nums">
                    {timeAgo(u.last_login_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
