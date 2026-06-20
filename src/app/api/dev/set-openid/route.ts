import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { setOpenidCookie, getOpenidFromCookie, clearOpenidCookie, getOpenidCookieOptions } from '@/lib/cookie';

/**
 * 手动 openid (访客编号) 绑定端点 (Phase 2 简化登录主路径)
 *
 * 路径: /api/dev/set-openid
 * 备注: 路径保留 dev 命名以保持 URL 兼容旧代码 + 依赖 (wechat/bind page 调用此路由)
 *       语义已升级为"手动绑定"主路径, 不再是 dev-only.
 *
 * 端点:
 *   GET    -> 读取当前 cookie 中的 openid (用于 bind 页面展示「已绑定」状态)
 *   POST   -> 设置/覆盖 openid cookie
 *             Body: { openid: string }  (4-32 位, [a-zA-Z0-9_-])
 *   DELETE -> 清除 cookie (登出/切换账号)
 *
 * 安全:
 *   - 路径名带 "dev" 是为了「防扫描」, 真实攻击者可以通过抓包找到端点
 *   - 主要防御靠 zod 严格校验 + 短 cookie (maxAge 1 年) + HTTP-only
 *   - Phase 4 可加 rate limit (5 次/分钟/IP)
 */
const setOpenidSchema = z.object({
  openid: z
    .string()
    .min(4, { message: '访客编号至少 4 位' })
    .max(32, { message: '访客编号最多 32 位' })
    .regex(/^[a-zA-Z0-9_\-]+$/, {
      message: 'openid 只能包含字母、数字、下划线、连字符',
    }),
});

/**
 * GET /api/dev/set-openid
 * 读取当前 openid. 用于 bind 页面显示「已绑定」状态.
 */
export async function GET() {
  try {
    const openid = await getOpenidFromCookie();
    return NextResponse.json({
      success: true,
      openid: openid || null,
      authenticated: !!openid,
    });
  } catch (error) {
    console.error('dev get-openid error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dev/set-openid
 * 设置 openid cookie. 生产环境也可用 (Phase 2 简化登录主路径).
 */
export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = setOpenidSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'INVALID_REQUEST',
          error: 'openid 不合法',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    await setOpenidCookie(parsed.data.openid);
    // 显式附加 cookie 到响应 (虽然 Next.js 15+ 在某些情况下会自动附加,
    // 但显式更可靠, 与其他 OAuth route handler 保持一致)
    const response = NextResponse.json({
      success: true,
      openid: parsed.data.openid,
      message: '已设置 openid cookie',
    });
    response.cookies.set(getOpenidCookieOptions(parsed.data.openid));
    return response;
  } catch (error) {
    console.error('dev set-openid error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dev/set-openid
 * 清除 openid cookie (登出/切换账号).
 */
export async function DELETE() {
  try {
    await clearOpenidCookie();
    return NextResponse.json({ success: true, message: '已清除 openid cookie' });
  } catch (error) {
    console.error('dev clear-openid error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: '服务器错误' },
      { status: 500 }
    );
  }
}
