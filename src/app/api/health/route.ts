/**
 * /api/health - 通用健康检查 (公开 GET)
 *
 * URL: GET /api/health
 * 用途: aiwill-keeper 探针 + 外部监控 (Pingdom / UptimeRobot 等)
 *
 * 改版 v1 (2026-09-01): 修复 AIWILL_PC_HEALTH 404
 *   - 背景: aiwill-keeper 每 5 分钟探针 https://aiwill-planner.cn/api/health
 *   - 原因: PC 域合规规则禁止 /api/* (除 admin/wechat/payment/articles/ab 外)
 *     没有 /api/health 这条 location, 全部 catch-all 返 404
 *   - 修复: 建本路由 + nginx 加 location = /api/health proxy_pass
 *   - 行为: H5 端 /api/health 早就返 200 (既有 nextjs 处理), PC 端补齐一致
 *   - 安全: 仅返 status/ts/region, 无 PII, 无内部服务暴露
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

// 强制动态: 每次返回最新时间戳
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const h = await headers();
  const host = h.get('host') || '';

  // 区分 PC 域 / H5 域, 让监控知道这是哪个域的健康状态
  const region = host.startsWith('h5.') ? 'mainland-cn-h5' : 'mainland-cn-pc';

  return NextResponse.json(
    {
      status: 'ok',
      ts: new Date().toISOString(),
      region,
      uptime_s: Math.floor(process.uptime()),
    },
    {
      status: 200,
      headers: {
        // 防止缓存, 每次都返回最新时间
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}