/**
 * 微信 OAuth 服务端回调页
 * 路径: /wechat/callback
 *
 * 完全服务端处理，Next.js App Router 服务端组件：
 *   1. 读 URL query: code, state
 *   2. 读 cookie: expectedState, returnTo
 *   3. CSRF 校验
 *   4. exchangeCode → getUserInfo → upsert Supabase
 *   5. 写入 wx_openid cookie
 *   6. 302 重定向到 /wechat/success
 *
 * 纯服务端处理，无需任何客户端 JS，不依赖 fetch
 */
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, getUserInfo } from '@/lib/wechat/oauth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { setOpenidCookie, getOauthStateCookie, clearOauthStateCookie } from '@/lib/cookie';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // 从 cookie 读取预存的 state 和 returnTo
  const { state: expectedState, returnTo } = await getOauthStateCookie();
  const finalReturnTo = returnTo || '/orders';

  // 立即清理 cookie
  await clearOauthStateCookie();

  // 参数校验
  if (!code || !state) {
    return NextResponse.redirect(
      `/wechat/callback?result=error&message=${encodeURIComponent('微信回调缺少 code 或 state 参数')}`,
      302
    );
  }

  if (!expectedState) {
    return NextResponse.redirect(
      `/wechat/callback?result=error&message=${encodeURIComponent('会话已过期，请重新发起登录')}`,
      302
    );
  }

  if (state !== expectedState) {
    return NextResponse.redirect(
      `/wechat/callback?result=error&message=${encodeURIComponent('state 校验失败，请重新登录')}`,
      302
    );
  }

  // 2. 兑换 token（服务端调用微信 API，无浏览器 fetch 限制）
  let token;
  try {
    token = await exchangeCode(code);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.redirect(
      `/wechat/callback?result=error&message=${encodeURIComponent('登录失败：' + message)}`,
      302
    );
  }

  // 3. 拉 userinfo
  let userInfo = null;
  if (token.scope.includes('userinfo')) {
    try {
      userInfo = await getUserInfo(token.access_token, token.openid);
    } catch (e: unknown) {
      // userinfo 拉失败不致命
    }
  }

  // 4. upsert 到 Supabase
  if (!supabaseAdmin) {
    return NextResponse.redirect(
      `/wechat/callback?result=error&message=${encodeURIComponent('服务未配置，请稍后重试')}`,
      302
    );
  }

  const upsertData: Record<string, unknown> = {
    openid: token.openid,
    unionid: token.unionid ?? userInfo?.unionid ?? null,
    wechat_nickname: userInfo?.nickname ?? null,
    wechat_avatar_url: userInfo?.headimgurl ?? null,
    last_login_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (userInfo?.nickname && !userInfo.nickname.match(/^[\u4e00-\u9fa5\w\s]+$/)) {
    // 包含 emoji 不存 display_name
  } else if (userInfo?.nickname) {
    upsertData.display_name = userInfo.nickname;
  }

  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id, openid, display_name, wechat_avatar_url')
    .eq('openid', token.openid)
    .maybeSingle();

  let userId: string;
  if (existing) {
    userId = existing.id;
    await supabaseAdmin.from('users').update(upsertData).eq('id', userId);
  } else {
    const tempEmail = `wx_${token.openid}@aiwill.local`;
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: tempEmail,
      email_confirm: true,
      user_metadata: { source: 'wechat_oauth' },
    });
    if (authError || !authUser.user) {
      return NextResponse.redirect(
        `/wechat/callback?result=error&message=${encodeURIComponent('创建账户失败，请稍后重试')}`,
        302
      );
    }
    userId = authUser.user.id;
    await supabaseAdmin.from('users').update(upsertData).eq('id', userId);
  }

  // 5. 写入 HTTP-only cookie（让后续请求自动携带）
  await setOpenidCookie(token.openid);

  // 6. 重定向到成功页
  return NextResponse.redirect(
    `/wechat/success?result=ok&return=${encodeURIComponent(finalReturnTo)}`,
    302
  );
}

// 渲染一个简单的 loading 页面（供服务端组件默认渲染使用）
// 实际上这个组件不会被渲染，因为上面直接 redirect 了
export default function WechatCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f5f7fa] to-white px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#07C160] border-t-transparent" />
        <h1 className="text-lg font-medium text-gray-900">正在登录…</h1>
        <p className="mt-2 text-sm text-gray-500">请稍候</p>
      </div>
    </main>
  );
}