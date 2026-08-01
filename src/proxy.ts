/**
 * 边缘代理 (Edge Proxy, Next.js 16 重命名自 middleware).
 *
 * 作用:
 *  1. 检测 ?ref=XXX 查询参数 (推广链接)
 *  2. 验证 ref_code 存在且博主 status='approved'
 *  3. 写入 HTTP-only cookie (maxAge 30 天)
 *  4. 记录一次点击到 affiliate_clicks 表
 *  5. 跳转时移除 ?ref= 参数 (URL 干净)
 *  6. (改版 v_global_2026-07-16) i18n locale cookie:
 *     - 识别 Accept-Language, 默认 zh-CN, 写入 NEXT_LOCALE cookie
 *     - /zh-CN/* 与 /en-US/* 显式路径切换 cookie
 *     - 不重定向根路径, 保护现有 SEO
 *
 * 匹配范围: 仅用户访问的页面 (/, /questionnaire, /orders, /payment)
 * 排除: /api/* (后端 API) / admin/* / _next/* / 静态资源
 */
import { NextRequest, NextResponse } from 'next/server';

const AFF_REF_COOKIE = 'aff_ref';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 天

// ref_code 格式: B + 6 字符 (大写字母+数字, 排除易混淆字符)
const REF_CODE_REGEX = /^B[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

// i18n locale (改版 v_global_2026-07-16)
const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: Locale = 'zh-CN';
const LOCALE_COOKIE = 'NEXT_LOCALE';

function pickLocaleFromAcceptLanguage(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const lower = acceptLanguage.toLowerCase();
  if (lower.includes('en')) return 'en-US';
  return DEFAULT_LOCALE;
}

export function proxy(request: NextRequest) {
  const { searchParams, pathname } = request.nextUrl;
  const response = NextResponse.next();

  // ===== i18n locale 处理 =====
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value as Locale | undefined;
  const currentLocale: Locale =
    cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)
      ? cookieLocale
      : pickLocaleFromAcceptLanguage(request.headers.get('accept-language'));

  if (pathname.startsWith('/zh-CN')) {
    response.cookies.set(LOCALE_COOKIE, 'zh-CN', { path: '/', maxAge: 60 * 60 * 24 * 365 });
  } else if (pathname.startsWith('/en-US')) {
    response.cookies.set(LOCALE_COOKIE, 'en-US', { path: '/', maxAge: 60 * 60 * 24 * 365 });
  } else if (!cookieLocale) {
    response.cookies.set(LOCALE_COOKIE, currentLocale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  }
  // 暴露 locale 给 SSR (Server Components 通过 cookies() 读)
  response.headers.set('x-locale', currentLocale);

  // ===== affiliate ref 处理 (原有逻辑) =====
  const refCode = searchParams.get('ref');

  if (refCode && REF_CODE_REGEX.test(refCode)) {
    response.cookies.set(AFF_REF_COOKIE, refCode, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const userAgent = request.headers.get('user-agent') || null;
    void recordClick(request.nextUrl.origin, refCode, ip, userAgent, pathname);
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
      cache: 'no-store',
    });
  } catch (err) {
    console.error('[proxy] recordClick failed:', err);
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
