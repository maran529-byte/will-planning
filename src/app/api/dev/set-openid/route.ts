import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { setOpenidCookie, clearOpenidCookie } from '@/lib/cookie';

/**
 * Dev-only endpoint: 手动设置 openid cookie.
 *
 * 用途: 在没有真实微信公众号 OAuth 环境下, 让开发者能模拟任意用户的 openid,
 *       便于在本地测试 openid 隔离逻辑.
 *
 * 安全: 仅在 NODE_ENV !== 'production' 时可用. 生产环境返回 404 (隐藏路由).
 *
 * 端点:
 *   POST { openid: string } -> 设置 cookie
 *   DELETE                  -> 清除 cookie (登出)
 */
const setOpenidSchema = z.object({
  openid: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\-]+$/, {
    message: 'openid 只能包含字母、数字、下划线、连字符',
  }),
});

export async function POST(request: NextRequest) {
  // 生产环境禁用
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

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
    return NextResponse.json({
      success: true,
      openid: parsed.data.openid,
      message: '已设置 openid cookie (仅 dev 环境)',
    });
  } catch (error) {
    console.error('dev set-openid error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: '服务器错误' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

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
