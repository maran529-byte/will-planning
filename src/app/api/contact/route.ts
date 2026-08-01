import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-server';

const contactSchema = z.object({
  name: z.string().min(1).max(40),
  email: z.string().email().max(120),
  topic: z.enum(['general', 'pre-marriage', 'during-marriage', 'divorce', 'child-custody', 'gift', 'inheritance', 'expert-review', 'payment', 'other']),
  message: z.string().min(10).max(2000),
});

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';

  let raw: Record<string, unknown>;
  try {
    if (contentType.includes('application/json')) {
      raw = await request.json();
    } else {
      const form = await request.formData();
      raw = {
        name: form.get('name')?.toString() || '',
        email: form.get('email')?.toString() || '',
        topic: form.get('topic')?.toString() || 'general',
        message: form.get('message')?.toString() || '',
      };
    }
  } catch (e) {
    console.error('[contact] parse failed:', (e as Error)?.message);
    if (contentType.includes('application/json')) {
      return NextResponse.json({ code: 'INVALID_BODY', error: '请求格式错误' }, { status: 400 });
    }
    return NextResponse.redirect(new URL('/contact?error=format', request.url));
  }

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('[contact] validation failed:', parsed.error.issues);
    if (contentType.includes('application/json')) {
      return NextResponse.json(
        { code: 'INVALID_FIELDS', error: '表单字段不合法', issues: parsed.error.issues },
        { status: 400 }
      );
    }
    return NextResponse.redirect(new URL('/contact?error=fields', request.url));
  }

  if (!supabaseAdmin) {
    console.error('[contact] supabase admin not configured');
    if (contentType.includes('application/json')) {
      return NextResponse.json({ code: 'DB_UNAVAILABLE', error: '数据库不可用' }, { status: 503 });
    }
    return NextResponse.redirect(new URL('/contact?error=server', request.url));
  }

  const { error } = await supabaseAdmin.from('contact_submissions').insert({
    name: parsed.data.name,
    email: parsed.data.email,
    topic: parsed.data.topic,
    message: parsed.data.message,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    user_agent: request.headers.get('user-agent')?.slice(0, 500) || null,
  });

  if (error) {
    console.error('[contact] insert failed:', error.message);
    if (contentType.includes('application/json')) {
      return NextResponse.json({ code: 'INSERT_FAILED', error: '提交失败，请稍后重试' }, { status: 500 });
    }
    return NextResponse.redirect(new URL('/contact?error=server', request.url));
  }

  if (contentType.includes('application/json')) {
    return NextResponse.json({ code: 'OK', message: '已收到，我们会在 24 小时内回复' });
  }
  return NextResponse.redirect(new URL('/contact?ok=1', request.url));
}
