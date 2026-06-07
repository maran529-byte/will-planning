import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase-server';

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

function timeAgo(iso: string | null): string {
  if (!iso) return '-';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  const d = Math.floor(h / 24);
  return `${d}天前`;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const { users, total } = await loadUsers(sp);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">👥 用户 ({total})</h1>

      <form className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-slate-600 mb-1">角色</label>
          <select
            name="role"
            defaultValue={sp.role || ''}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm"
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-slate-600 mb-1">搜索</label>
          <input
            name="q"
            defaultValue={sp.q || ''}
            placeholder="openid / 邮箱 / 昵称 / 手机"
            className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 text-sm font-medium"
        >
          过滤
        </button>
        {(sp.role || sp.q) && (
          <Link href="/admin/users" className="text-sm text-slate-500 hover:text-slate-700">
            清除
          </Link>
        )}
      </form>

      <div className="rounded-xl bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-2 text-left">openid</th>
              <th className="px-4 py-2 text-left">昵称</th>
              <th className="px-4 py-2 text-left">邮箱</th>
              <th className="px-4 py-2 text-left">手机</th>
              <th className="px-4 py-2 text-left">角色</th>
              <th className="px-4 py-2 text-left">状态</th>
              <th className="px-4 py-2 text-right">注册</th>
              <th className="px-4 py-2 text-right">最近登录</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  暂无用户
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-xs text-slate-600 max-w-[150px] truncate">
                    {u.openid || '-'}
                  </td>
                  <td className="px-4 py-2">{u.display_name || u.wechat_nickname || '-'}</td>
                  <td className="px-4 py-2 text-xs">{u.email || '-'}</td>
                  <td className="px-4 py-2 text-xs">{u.phone || '-'}</td>
                  <td className="px-4 py-2">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-2 text-xs">{u.status || 'active'}</td>
                  <td className="px-4 py-2 text-right text-xs text-slate-500">
                    {timeAgo(u.created_at)}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-slate-500">
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

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    user: { label: '用户', cls: 'bg-slate-100 text-slate-600' },
    blogger: { label: '博主', cls: 'bg-pink-100 text-pink-700' },
    lawyer: { label: '律师', cls: 'bg-purple-100 text-purple-700' },
    admin: { label: '管理员', cls: 'bg-amber-100 text-amber-700' },
  };
  const m = map[role] || { label: role, cls: 'bg-slate-100 text-slate-600' };
  return <span className={`text-xs px-2 py-0.5 rounded ${m.cls}`}>{m.label}</span>;
}
