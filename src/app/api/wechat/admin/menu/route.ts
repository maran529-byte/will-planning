/**
 * 公众号自定义菜单管理端点
 * POST /api/wechat/admin/menu
 *
 * 用法:  改 src/lib/wechat/menu-config.ts → git push → 触发 redeploy → 调本端点
 *   curl -X POST -H "X-Internal-Token: $INTERNAL_API_TOKEN" \
 *        https://h5.aiwill-planner.cn/api/wechat/admin/menu
 *
 * 鉴权: 复用 INTERNAL_API_TOKEN (与 send-cs-msg 一致)
 *
 * 为什么需要这个端点:
 *   - 公众号有 IP 白名单, 本地 curl 调 menu/create 会 40164
 *   - Vercel Function 出口 IP 在白名单内, 一键推送
 *   - 所有菜单变更走 git 记录, 可审计可回滚
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createMenu, deleteMenu, getMpAccessToken, type MenuConfig } from '@/lib/wechat/mp-api';
import { MP_MENU } from '@/lib/wechat/menu-config';
import { assertWeChatMpConfigured } from '@/lib/wechat/config';

const ActionSchema = z.object({
  action: z.enum(['create', 'delete', 'preview']).default('create'),
  menu: z
    .object({
      button: z.array(z.any()),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  // 1. 内部鉴权
  const token = req.headers.get('x-internal-token');
  if (token !== process.env.INTERNAL_API_TOKEN) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 2. 解析 body (允许 inline 覆盖默认 menu)
  let body: z.infer<typeof ActionSchema> = { action: 'create' };
  if (req.headers.get('content-type')?.includes('json')) {
    try {
      const raw = await req.json();
      body = ActionSchema.parse(raw);
    } catch (e: any) {
      return NextResponse.json(
        { error: 'invalid_input', message: e.message ?? String(e) },
        { status: 400 }
      );
    }
  }

  // 3. preview 模式: 不调 API, 只返回将要推送的菜单
  if (body.action === 'preview') {
    return NextResponse.json({
      ok: true,
      action: 'preview',
      menu: MP_MENU,
      source: 'src/lib/wechat/menu-config.ts',
    });
  }

  // 4. create / delete 需要 mp 配置
  try {
    assertWeChatMpConfigured();
  } catch (e: any) {
    return NextResponse.json(
      { error: 'mp_not_configured', message: e.message },
      { status: 500 }
    );
  }

  try {
    if (body.action === 'delete') {
      await deleteMenu();
      return NextResponse.json({ ok: true, action: 'delete' });
    }

    // action === 'create' (default)
    const menu: MenuConfig = body.menu
      ? (body.menu as MenuConfig)
      : MP_MENU;

    // 二次确认菜单非空
    if (!menu.button || menu.button.length === 0) {
      return NextResponse.json(
        { error: 'empty_menu', message: 'menu.button cannot be empty' },
        { status: 400 }
      );
    }

    await createMenu(menu);

    return NextResponse.json({
      ok: true,
      action: 'create',
      buttons: menu.button.length,
      source: body.menu ? 'inline_body' : 'src/lib/wechat/menu-config.ts',
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: 'wechat_api_failed',
        message: e.message ?? String(e),
        hint: 'If 40164: 公众号 IP 白名单未含 Vercel 出口 IP. 在 mp.weixin.qq.com → 设置与开发 → 基本配置 → 公众号开发信息 → IP 白名单 添加.',
      },
      { status: 502 }
    );
  }
}

/**
 * GET: 健康检查 + 当前菜单预览 (需 token)
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get('x-internal-token');
  if (token !== process.env.INTERNAL_API_TOKEN) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const action = searchParams.get('action') ?? 'preview';

  if (action === 'fetch') {
    // 调微信接口拉当前菜单
    try {
      assertWeChatMpConfigured();
      const accessToken = await getMpAccessToken();
      const res = await fetch(
        `https://api.weixin.qq.com/cgi-bin/menu/get?access_token=${accessToken}`,
        { method: 'GET', cache: 'no-store' }
      );
      const data = await res.json();
      return NextResponse.json(data);
    } catch (e: any) {
      return NextResponse.json(
        { error: 'wechat_api_failed', message: e.message },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    usage: {
      create: 'POST /api/wechat/admin/menu  (uses src/lib/wechat/menu-config.ts)',
      delete: 'POST /api/wechat/admin/menu  body: {"action":"delete"}',
      preview: 'GET  /api/wechat/admin/menu  (returns MP_MENU)',
      fetch: 'GET  /api/wechat/admin/menu?action=fetch  (fetches live from WeChat)',
    },
  });
}
