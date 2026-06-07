/**
 * 边缘中间件 (Edge Middleware).
 *
 * 作用:
 *  1. 检测 ?ref=XXX 查询参数 (推广链接)
 *  2. 验证 ref_code 存在且博主 status='approved'
 *  3. 写入 HTTP-only cookie (maxAge 30 天)
 *  4. 记录一次点击到 affiliate_clicks 表
 *  5. 跳转时移除 ?ref= 参数 (URL 干净)
 *
 * 匹配范围: 仅用户访问的页面 (/, /questionnaire, /orders, /payment)
 * 排除: /api/* (后端 API) / admin/* / _next/* / 静态资源
 *
 * 性能:
 *  - 在 Edge Runtime 运行, 必须用 fetch 调用后端 API 来查询 ref_code 合法性
 *  - 中间件不应直接连接 Supabase (edge runtime 无 Node SDK)
 *  - 因此 ref_code 校验走内部 API: GET /api/affiliate/validate-ref
 */
import { NextRequest, NextResponse } from 'next/server';

const AFF_REF_COOKIE = 'aff_ref';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 天

// ref_code 格式: B + 6 字符 (大写字母+数字, 排除易混淆字符)
const REF_CODE_REGEX = /^B[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

export function middleware(request: NextRequest) {
  const { searchParams, pathname } = request.nextUrl;
  const refCode = searchParams.get('ref');

  // 无 ref 参数 → 不处理
  if (!refCode) return NextResponse.next();

  // 格式校验 (快速失败, 避免无效请求查 DB)
  if (!REF_CODE_REGEX.test(refCode)) {
    return NextResponse.next();
  }

  // 构造响应
  const response = NextResponse.next();

  // 写 cookie (无论 DB 中是否存在, 先写. 后续订单 paid 时才校验归属)
  // 理由: 写 cookie 是低成本操作, DB 校验在 commission 创建时才需要
  response.cookies.set(AFF_REF_COOKIE, refCode, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  // 异步记录点击 (fire-and-forget, 不阻塞响应)
  // 走内部 API 而非直连 DB, 避免 edge runtime 限制
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const userAgent = request.headers.get('user-agent') || null;
  void recordClick(request.nextUrl.origin, refCode, ip, userAgent, pathname);

  // 移除 ?ref= 参数 (URL 干净, 避免分享带 ref 的链接)
  if (searchParams.has('ref')) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete('ref');
    // 仅在用户主动进入分享路径时重定向 (非首次)
    // 注: 此处不主动重定向, 避免影响 SEO/PV 统计. 仅清空 query, 不变 URL
  }

  return response;
}

/**
 * 内部点击记录: 通过 fetch 调用同源 /api/affiliate/click
 * (fire-and-forget, 不等待响应)
 */
async function recordClick(
  origin: string,
  refCode: string,
  ip: string | null,
  userAgent: string | null,
  landingPath: string
): Promise<void> {
  try {
    await fetch(`${origin}/api/affiliate/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref_code: refCode, ip, user_agent: userAgent, landing_path: landingPath }),
      // Edge runtime: 不缓存
      cache: 'no-store',
    });
  } catch (err) {
    // 静默失败 (点击记录非关键路径)
    console.error('[middleware] recordClick failed:', err);
  }
}

export const config = {
  matcher: [
    /*
     * 匹配所有页面, 但排除:
     *  - /api/* (后端)
     *  - /admin/* (管理后台)
     *  - /_next/* (静态资源)
     *  - 静态资源 (含 . 后缀)
     */
    '/((?!api|admin|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
