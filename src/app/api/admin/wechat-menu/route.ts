import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createMenu, deleteMenu, getMpAccessToken } from '@/lib/wechat/mp-api';
import { assertWeChatMpConfigured } from '@/lib/wechat/config';
import { MP_MENU } from '@/lib/wechat/menu-config';

/**
 * Admin 公众号菜单管理 (Phase 5 - PC 登录流程集成)
 *
 * GET    /api/admin/wechat-menu        返回当前 MP_MENU 配置 (preview)
 * POST   /api/admin/wechat-menu        action: 'create' | 'delete' | 'fetch'
 *
 * 鉴权: requireAdmin() (Supabase Auth + role='admin')
 * 区别于 /api/wechat/admin/menu:
 *   - 那个用 X-Internal-Token (CI/CD 用, 不需要登录态)
 *   - 这个用 admin session cookie (UI 用, 需要 admin 登录)
 *
 * 防爆: 没加 rate limit, 但 requireAdmin 已阻挡未登录 + 角色校验
 */

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authenticated) {
    return NextResponse.json({ code: 'UNAUTHENTICATED', error: auth.reason }, { status: auth.status });
  }
  return NextResponse.json({ ok: true, menu: MP_MENU, source: 'src/lib/wechat/menu-config.ts' });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authenticated) {
    return NextResponse.json({ code: 'UNAUTHENTICATED', error: auth.reason }, { status: auth.status });
  }

  let action = 'create';
  try {
    const body = await request.json().catch(() => ({}));
    action = String(body?.action || 'create');
  } catch {
    /* ignore body parse error, use default */
  }

  if (action === 'preview') {
    return NextResponse.json({ ok: true, action, menu: MP_MENU });
  }

  if (action === 'fetch') {
    try {
      assertWeChatMpConfigured();
      const accessToken = await getMpAccessToken();
      const res = await fetch(
        `https://api.weixin.qq.com/cgi-bin/menu/get?access_token=${accessToken}`,
        { method: 'GET', cache: 'no-store' }
      );
      const data = await res.json();
      return NextResponse.json(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        { code: 'WECHAT_API_FAILED', message, hint: '检查 WECHAT_MP_APP_SECRET 是否配置 + 公众号 IP 白名单是否含 124.222.215.107' },
        { status: 502 }
      );
    }
  }

  if (action === 'delete') {
    try {
      assertWeChatMpConfigured();
      await deleteMenu();
      return NextResponse.json({ ok: true, action: 'delete' });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ code: 'WECHAT_API_FAILED', message }, { status: 502 });
    }
  }

  // action === 'create'
  try {
    assertWeChatMpConfigured();
    await createMenu(MP_MENU);
    return NextResponse.json({
      ok: true,
      action: 'create',
      buttons: MP_MENU.button.length,
      source: 'src/lib/wechat/menu-config.ts',
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        code: 'WECHAT_API_FAILED',
        message,
        hint: '如 40164: 公众号 IP 白名单需含 124.222.215.107 (mp.weixin.qq.com → 设置与开发 → 基本配置 → IP 白名单). 如 48001: 账号不是服务号.',
      },
      { status: 502 }
    );
  }
}
