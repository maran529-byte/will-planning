'use client';

import { useEffect, useState } from 'react';
import { MP_MENU } from '@/lib/wechat/menu-config';

type RemoteMenu = {
  menu?: Array<{
    name: string;
    sub_button?: Array<{ name: string; type: string; url?: string; key?: string }>;
  }>;
  errcode?: number;
  errmsg?: string;
};

/**
 * /admin/wechat-menu - 公众号自定义菜单推送 (admin UI)
 *
 * 改版 v13 (2026-06-30):
 *   - 把 /api/wechat/admin/menu (token 鉴权) 替换为 /api/admin/wechat-menu (admin session 鉴权)
 *   - 让 admin 在 UI 上点按钮直接推送菜单 (无需 curl + token)
 *   - 含 preview / fetch-live / push / delete 4 个动作
 *
 * 流程:
 *   1. 进入页面 → 拉取 src/lib/wechat/menu-config.ts 的 menu preview
 *   2. 点"拉取微信端菜单" → 看当前实际生效的菜单
 *   3. 点"推送菜单到微信" → 写入 menu-config.ts 的内容到公众号
 *   4. 点"删除菜单" → 清空微信端菜单 (本地 menu-config.ts 不动)
 */
export default function WeChatMenuPage() {
  const [localMenu, setLocalMenu] = useState<typeof MP_MENU | null>(null);
  const [remoteMenu, setRemoteMenu] = useState<RemoteMenu | null>(null);
  const [busy, setBusy] = useState<'preview' | 'fetch' | 'push' | 'delete' | null>(null);
  const [result, setResult] = useState<{ kind: 'ok' | 'err'; message: string } | null>(null);

  async function call(action: 'preview' | 'fetch' | 'push' | 'delete') {
    setBusy(action);
    setResult(null);
    try {
      const res = await fetch('/api/admin/wechat-menu', {
        method: action === 'preview' ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: action === 'preview' || action === 'fetch' ? undefined : JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        const detail = data.message || data.hint || JSON.stringify(data);
        setResult({ kind: 'err', message: `${action} 失败: ${data.code || res.status} - ${detail}` });
      } else {
        if (action === 'fetch') setRemoteMenu(data);
        if (action === 'push') {
          setResult({ kind: 'ok', message: `✅ 推送成功 (${data.buttons} 个一级菜单)` });
        } else if (action === 'delete') {
          setResult({ kind: 'ok', message: '✅ 已删除微信端菜单' });
        } else if (action === 'preview') {
          setLocalMenu(data.menu);
          setResult({ kind: 'ok', message: '✅ 预览已加载' });
        }
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setResult({ kind: 'err', message: `网络错误: ${message}` });
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    setLocalMenu(MP_MENU);
  }, []);

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">公众号自定义菜单</h1>
          <p className="text-sm text-slate-500 mt-1">
            推送 <code className="px-1.5 py-0.5 rounded bg-slate-100 text-xs">src/lib/wechat/menu-config.ts</code> 的菜单配置到公众号。
          </p>
        </div>
      </header>

      {result && (
        <div
          role="status"
          className={`p-3 rounded text-sm ${
            result.kind === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
          }`}
        >
          {result.message}
        </div>
      )}

      <section className="bg-white rounded-lg shadow-sm p-4">
        <h2 className="text-base font-semibold text-slate-900 mb-3">操作</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => call('preview')}
            disabled={busy !== null}
            className="px-4 py-2 rounded bg-slate-100 text-slate-700 text-sm hover:bg-slate-200 disabled:opacity-50"
          >
            🔍 重新加载本地预览
          </button>
          <button
            onClick={() => call('fetch')}
            disabled={busy !== null}
            className="px-4 py-2 rounded bg-blue-100 text-blue-800 text-sm hover:bg-blue-200 disabled:opacity-50"
          >
            📥 拉取微信端当前菜单
          </button>
          <button
            onClick={() => call('push')}
            disabled={busy !== null}
            className="px-4 py-2 rounded bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            🚀 推送到微信 ({localMenu?.button.length || 0} 个一级菜单)
          </button>
          <button
            onClick={() => {
              if (confirm('确认清空微信端所有自定义菜单？')) call('delete');
            }}
            disabled={busy !== null}
            className="px-4 py-2 rounded bg-rose-100 text-rose-800 text-sm hover:bg-rose-200 disabled:opacity-50"
          >
            🗑️ 删除微信端菜单
          </button>
        </div>
        {busy && (
          <p className="text-xs text-slate-500 mt-3">正在执行 {busy}…</p>
        )}
      </section>

      <section className="bg-white rounded-lg shadow-sm p-4">
        <h2 className="text-base font-semibold text-slate-900 mb-3">本地配置 (menu-config.ts)</h2>
        {localMenu ? (
          <MenuTree title="" menu={localMenu} />
        ) : (
          <p className="text-sm text-slate-500">加载中…</p>
        )}
      </section>

      <section className="bg-white rounded-lg shadow-sm p-4">
        <h2 className="text-base font-semibold text-slate-900 mb-3">微信端实际生效</h2>
        {remoteMenu ? (
          remoteMenu.errcode !== undefined && remoteMenu.errcode !== 0 ? (
            <p className="text-sm text-rose-700">
              errcode={remoteMenu.errcode} {remoteMenu.errmsg}
              {remoteMenu.errcode === 46003 ? '(菜单不存在，先点"推送")' : ''}
            </p>
          ) : (
            <MenuTree2 title="" menu={remoteMenu.menu || []} />
          )
        ) : (
          <p className="text-sm text-slate-500">点上方"拉取微信端当前菜单"查看</p>
        )}
      </section>

      <section className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
        <h2 className="text-base font-semibold mb-2">💡 推送失败排查</h2>
        <ul className="space-y-1 list-disc list-inside">
          <li>
            <code className="text-xs">WECHAT_MP_APP_SECRET</code> 未配置 → 错误: 「WECHAT_MP_APP_ID / WECHAT_MP_APP_SECRET 未配置」
          </li>
          <li>
            <code className="text-xs">errcode 40164</code> → 公众号 IP 白名单未含 <code className="text-xs">124.222.215.107</code>
            （<strong>mp.weixin.qq.com → 设置与开发 → 基本配置 → 公众号开发信息 → IP 白名单</strong>）
          </li>
          <li>
            <code className="text-xs">errcode 48001</code> → 账号不是服务号（订阅号无菜单权限）
          </li>
          <li>
            <code className="text-xs">errcode 40001 / 42001</code> → access_token 失效，重试
          </li>
        </ul>
      </section>
    </div>
  );
}

function MenuTree({ title, menu }: { title: string; menu: { button: Array<{ name: string; type?: string; url?: string; key?: string; sub_button?: unknown[] }> } }) {
  return (
    <div className="space-y-2">
      {title && <p className="text-xs text-slate-500">{title}</p>}
      <div className="grid sm:grid-cols-3 gap-3">
        {menu.button.map((btn, i) => (
          <div key={i} className="border border-slate-200 rounded p-3 bg-slate-50">
            <p className="font-medium text-sm text-slate-900 mb-1">{btn.name}</p>
            {btn.sub_button && btn.sub_button.length > 0 ? (
              <ul className="text-xs text-slate-600 space-y-1">
                {(btn.sub_button as Array<{ name: string; type?: string; url?: string; key?: string }>).map((sub, j) => (
                  <li key={j} className="truncate">
                    <span className="text-slate-400">↳</span> {sub.name}
                    {sub.url && <span className="text-slate-400 ml-1 text-[10px]">(view)</span>}
                    {sub.key && <span className="text-slate-400 ml-1 text-[10px]">(click: {sub.key})</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">
                {btn.type === 'view' && btn.url ? `[view] ${btn.url}` : null}
                {btn.type === 'click' && btn.key ? `[click] ${btn.key}` : null}
                {!btn.type && btn.url ? `→ ${btn.url}` : null}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuTree2({ title, menu }: { title: string; menu: Array<{ name: string; sub_button?: Array<{ name: string; type: string; url?: string; key?: string }> }> }) {
  return (
    <div className="space-y-2">
      {title && <p className="text-xs text-slate-500">{title}</p>}
      <div className="grid sm:grid-cols-3 gap-3">
        {menu.map((btn, i) => (
          <div key={i} className="border border-slate-200 rounded p-3 bg-slate-50">
            <p className="font-medium text-sm text-slate-900 mb-1">{btn.name}</p>
            {btn.sub_button && btn.sub_button.length > 0 ? (
              <ul className="text-xs text-slate-600 space-y-1">
                {btn.sub_button.map((sub, j) => (
                  <li key={j} className="truncate">
                    <span className="text-slate-400">↳</span> {sub.name}
                    {sub.url && <span className="text-slate-400 ml-1 text-[10px]">(view)</span>}
                    {sub.key && <span className="text-slate-400 ml-1 text-[10px]">({sub.key})</span>}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
