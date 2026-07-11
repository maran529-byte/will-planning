import { NextRequest, NextResponse } from 'next/server';
import { getOrdersByOpenidServer, getOrdersByOpenidLocal } from '@/lib/orders';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getOpenidFromCookie } from '@/lib/cookie';

/**
 * GET /api/orders
 *
 * 返回当前登录用户的所有订单 (按创建时间倒序).
 *
 * 改版 (2026-07-11): 新增此端点, 替代 GET /api/create-order 的列表副作用.
 *  - 修复前: 前端调 GET /api/create-order 拿订单列表 (语义混淆, 不符合 REST)
 *  - 修复后: 前端调 GET /api/orders 拿订单列表, 符合 REST 命名约定
 *
 * 安全:
 *  - 必须登录态 (有 openid cookie) 才能看到自己的订单
 *  - openid 为空时返回空列表 + authenticated: false, 便于前端显示"请登录"
 */
export async function GET(request: NextRequest) {
  try {
    const openid = await getOpenidFromCookie();

    // 注意: openid 为空时, 返回空列表, 而非全部订单.
    const orders = supabaseAdmin
      ? await getOrdersByOpenidServer(openid)
      : getOrdersByOpenidLocal(openid);

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10) || 50));

    const sorted = [...orders].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const start = (page - 1) * limit;
    const paged = sorted.slice(start, start + limit);

    return NextResponse.json({
      success: true,
      orders: paged,
      total: sorted.length,
      page,
      limit,
      authenticated: !!openid,
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: '服务器错误' },
      { status: 500 }
    );
  }
}