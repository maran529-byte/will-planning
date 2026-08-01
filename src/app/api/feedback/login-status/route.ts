import { NextRequest, NextResponse } from "next/server";
import { getOpenidFromCookie } from "@/lib/cookie";

/**
 * GET /api/feedback/login-status
 *
 * 检测当前会话是否已通过公众号 OAuth 登录 (有 wx_openid cookie).
 * 前端 /feedback 页用此判断是否显示"登录后再提交"的提示卡.
 */
export async function GET(_request: NextRequest) {
  const openid = await getOpenidFromCookie();
  return NextResponse.json({
    success: true,
    logged_in: !!openid,
  });
}
