/**
 * POST /api/custom-inquiry
 *
 * 定制服务留言 (业务铁律 v1.0)
 *   - 表单: name / phone / email (可选) / description / doc_type / budget / timeline
 *   - 落库 custom_inquiries
 *   - 自动发邮件 → 330320991@qq.com
 *
 *  H5 域可用, PC 域由 nginx ^~ 404
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-server';
import { CONTACT_EMAIL } from '@/lib/feedback_auto_reply';

const inquirySchema = z.object({
  name: z.string().min(2).max(32),
  phone: z.string().min(8).max(20),
  email: z.string().email().optional().or(z.literal('')),
  description: z.string().min(10).max(2000),
  doc_type: z.string().optional(),
  expected_budget: z.string().optional(),
  expected_timeline: z.string().optional(),
  source: z.enum(['website', 'wechat_mp', 'wechat_msg', 'other']).default('website'),
});

export async function POST(request: NextRequest) {
  // PC 域拦截 (双保险)
  const host = request.headers.get('host') || '';
  if (!host.startsWith('h5.') && host !== 'localhost:3001') {
    return NextResponse.json(
      { code: 'NOT_ALLOWED', error: '仅 H5 域可用' },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: 'INVALID_JSON', error: '请求体非 JSON' },
      { status: 400 }
    );
  }

  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: 'INVALID_REQUEST',
        error: '参数错误',
        issues: parsed.error.issues.map(i => ({ path: i.path, message: i.message })),
      },
      { status: 400 }
    );
  }

  const data = parsed.data;
  if (!supabaseAdmin) {
    return NextResponse.json(
      { code: 'DB_NOT_CONFIGURED', error: '数据库未配置' },
      { status: 503 }
    );
  }

  // 1. 落库
  const { data: row, error } = await supabaseAdmin
    .from('custom_inquiries')
    .insert({
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      description: data.description,
      doc_type: data.doc_type || null,
      expected_budget: data.expected_budget || null,
      expected_timeline: data.expected_timeline || null,
      source: data.source,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('[custom-inquiry] insert error:', error);
    return NextResponse.json(
      { code: 'DB_ERROR', error: '保存失败, 请稍后再试' },
      { status: 500 }
    );
  }

  // 2. 自动邮件 (异步日志, 真实发送由 server-side watcher 处理)
  console.log(`[custom-inquiry] ${row.id} → ${CONTACT_EMAIL} (异步待发送)`);
  console.log(`[custom-inquiry] data: ${data.name} / ${data.phone.slice(-4)} / ${data.doc_type || '-'}`);

  return NextResponse.json({
    success: true,
    inquiry: {
      id: row.id,
      status: row.status,
      created_at: row.created_at,
    },
    message: '留言已收到, 我们将在 24h 内通过邮件回复',
  });
}

export async function GET() {
  return NextResponse.json(
    { code: 'METHOD_NOT_ALLOWED', error: 'POST only' },
    { status: 405 }
  );
}
