import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOpenidFromCookie } from '@/lib/cookie';
import { createInvoiceRequest, getInvoiceRequestsServer } from '@/lib/invoices';

const CreateInvoiceSchema = z.object({
  order_id: z.string().uuid(),
  invoice_type: z.enum(['personal', 'company']),
  title: z.string().min(1).max(100),
  tax_id: z.string().max(50).optional(),
  amount_cents: z.number().int().positive(),
  contact_email: z.string().email().max(100),
  contact_phone: z.string().max(20).optional(),
});

/**
 * POST /api/account/invoice
 * 提交发票申请
 */
export async function POST(req: NextRequest) {
  const openid = await getOpenidFromCookie();
  if (!openid) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体不是合法 JSON' }, { status: 400 });
  }

  const parsed = CreateInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '参数错误', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const result = await createInvoiceRequest({
    orderId: parsed.data.order_id,
    openid,
    invoiceType: parsed.data.invoice_type,
    title: parsed.data.title,
    taxId: parsed.data.tax_id,
    amountCents: parsed.data.amount_cents,
    contactEmail: parsed.data.contact_email,
    contactPhone: parsed.data.contact_phone,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ success: true, invoice: result.invoice });
}

/**
 * GET /api/account/invoice
 * 列出当前用户的发票申请
 */
export async function GET() {
  const openid = await getOpenidFromCookie();
  if (!openid) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const invoices = await getInvoiceRequestsServer(openid);
  return NextResponse.json({ success: true, invoices });
}
