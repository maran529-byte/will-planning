// 涉外附件查询 API
// 改版 v1 (2026-07-16, 全球化项目 W1.7)
//
// GET /api/contracts/cross-border-attachment?doc_type=prenup
//   → 返回当前版本的涉外法律告知附件 (Markdown)
//   → 公开访问, 无需登录 (供生成器下载渲染)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_INTERNAL_URL, SUPABASE_ANON_KEY } from '@/lib/config';

const VALID_DOC_TYPES = ['prenup', 'postnup', 'divorce', 'custody', 'gift', 'will'] as const;
type DocType = (typeof VALID_DOC_TYPES)[number];

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const docType = url.searchParams.get('doc_type') as DocType | null;

  if (!docType || !VALID_DOC_TYPES.includes(docType)) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_DOC_TYPE', valid: VALID_DOC_TYPES },
      { status: 400 }
    );
  }

  if (!SUPABASE_INTERNAL_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { ok: false, error: 'SUPABASE_NOT_CONFIGURED' },
      { status: 503 }
    );
  }

  try {
    const supabase = createClient(SUPABASE_INTERNAL_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from('cross_border_attachments')
      .select('doc_type, version, content, law_reviewer, law_reviewed_at')
      .eq('doc_type', docType)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: 'NOT_FOUND', doc_type: docType },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ok: true, attachment: data },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL', message },
      { status: 500 }
    );
  }
}
