import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/doc/[id]/download?format=pdf|docx
 *
 * 改版 v3 (2026-07-09): P0-4 修复 (闭环任务 FIX-032)
 * 文书下载 — 用于 /result 页面"下载 PDF/Word"按钮
 *
 * 输入: path: id, query: format (pdf | docx)
 * 输出 200: { url, expiresAt }
 * 输出 404: { error: 'DOC_NOT_READY' } (文书生成中)
 * 输出 500: { error: 'GENERATE_FAILED' }
 */

const VALID_FORMATS = new Set(['pdf', 'docx']);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const format = request.nextUrl.searchParams.get('format') || 'pdf';

  if (!id) {
    return NextResponse.json(
      { error: 'INVALID_ID' },
      { status: 400 }
    );
  }

  if (!VALID_FORMATS.has(format)) {
    return NextResponse.json(
      {
        error: 'INVALID_FORMAT',
        message: 'format 必须为 pdf 或 docx',
      },
      { status: 400 }
    );
  }

  // Mock: 真实场景从 Supabase + 渲染服务生成 PDF
  // const order = await supabase.from('orders').select('*').eq('id', id).single();
  // if (!order || order.status !== 'paid') return 404
  // const pdfUrl = await generatePdfFromTemplate(order.docType, order.answers);
  // return { url: pdfUrl, expiresAt: ... }

  // Mock 阶段: 返回一个 mock PDF URL (前端展示下载按钮即可)
  const mockUrl = `/api/doc/${id}/mock-${format}.${format}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

  return NextResponse.json(
    {
      url: mockUrl,
      expiresAt,
      format,
      fileName: `家有所爱-${id}.${format}`,
      fileSize: format === 'pdf' ? 245678 : 156432,
      mock: true,
      message: '当前为 mock URL, 真实 PDF 由 LLM + 模板引擎生成',
    },
    { status: 200 }
  );
}