/**
 * 发票申请系统.
 *
 * 业务流程:
 *   1. 用户对已支付订单提交发票申请 (个人/公司)
 *   2. 管理员在后台审批 (通过 → issued, 驳回 → rejected + 原因)
 *   3. 用户在 /account 查申请状态 + 下载电子发票 PDF
 *
 * 数据模型: 1 订单可多次申请 (驳回后重提), 状态由 invoice_status 控制.
 */
import { supabaseAdmin } from './supabase-server';

export type InvoiceType = 'personal' | 'company';
export type InvoiceStatus = 'pending' | 'approved' | 'rejected' | 'issued';

export interface InvoiceRequest {
  id: string;
  order_id: string;
  openid: string;
  invoice_type: InvoiceType;
  title: string;
  tax_id: string | null;
  amount_cents: number;
  contact_email: string;
  contact_phone: string | null;
  status: InvoiceStatus;
  admin_note: string | null;
  invoice_url: string | null;
  processed_at: string | null;
  processed_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 查询用户的发票申请.
 * 服务端 SERVICE_ROLE, 客户端 API 层用 .eq('openid', openid) 过滤.
 */
export async function getInvoiceRequestsServer(openid: string): Promise<InvoiceRequest[]> {
  if (!supabaseAdmin) return [];
  if (!openid) return [];
  const { data, error } = await supabaseAdmin
    .from('invoice_requests')
    .select('*')
    .eq('openid', openid)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getInvoiceRequestsServer error:', error);
    return [];
  }
  return (data || []) as InvoiceRequest[];
}

/**
 * 提交发票申请.
 *
 * 校验:
 *  - 订单存在 + 属于当前 openid
 *  - 订单状态 = 'paid'
 *  - 该订单未被 approved/issued (驳回的允许重提)
 *  - 邮箱格式
 */
export async function createInvoiceRequest(params: {
  orderId: string;
  openid: string;
  invoiceType: InvoiceType;
  title: string;
  taxId?: string;
  amountCents: number;
  contactEmail: string;
  contactPhone?: string;
}): Promise<{ success: boolean; invoice?: InvoiceRequest; reason?: string }> {
  if (!supabaseAdmin) return { success: false, reason: 'DB 未配置' };

  // 1. 邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(params.contactEmail)) {
    return { success: false, reason: '邮箱格式不正确' };
  }

  // 2. 校验订单归属
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select('id, order_no, openid, status, amount')
    .eq('id', params.orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return { success: false, reason: '订单不存在' };
  }
  if (order.openid !== params.openid) {
    return { success: false, reason: '订单不属于当前用户' };
  }
  if (order.status !== 'paid') {
    return { success: false, reason: `订单状态 ${order.status} 不支持申请发票` };
  }

  // 3. 公司发票必须有税号
  if (params.invoiceType === 'company' && !params.taxId) {
    return { success: false, reason: '公司发票必须填写税号' };
  }

  // 4. 不允许同一订单同时存在 approved/issued
  const { data: active } = await supabaseAdmin
    .from('invoice_requests')
    .select('id, status')
    .eq('order_id', params.orderId)
    .in('status', ['pending', 'approved', 'issued']);

  if (active && active.length > 0) {
    return { success: false, reason: '该订单已有进行中/已通过的发票申请, 不可重复提交' };
  }

  // 5. INSERT
  const { data, error } = await supabaseAdmin
    .from('invoice_requests')
    .insert({
      order_id: params.orderId,
      openid: params.openid,
      invoice_type: params.invoiceType,
      title: params.title,
      tax_id: params.taxId || null,
      amount_cents: params.amountCents,
      contact_email: params.contactEmail,
      contact_phone: params.contactPhone || null,
      status: 'pending',
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    console.error('createInvoiceRequest error:', error);
    return { success: false, reason: error?.message || '提交失败' };
  }

  return { success: true, invoice: data as InvoiceRequest };
}

/**
 * 管理员审批.
 * approved → issued 时, invoice_url 必填 (PDF 链接).
 */
export async function processInvoiceRequest(params: {
  invoiceId: string;
  adminId: string;
  decision: 'approved' | 'rejected' | 'issued';
  adminNote?: string;
  invoiceUrl?: string;
}): Promise<{ success: boolean; invoice?: InvoiceRequest; reason?: string }> {
  if (!supabaseAdmin) return { success: false, reason: 'DB 未配置' };

  const { data: existing } = await supabaseAdmin
    .from('invoice_requests')
    .select('*')
    .eq('id', params.invoiceId)
    .maybeSingle();

  if (!existing) return { success: false, reason: '申请不存在' };

  // 状态机检查
  if (params.decision === 'approved' && existing.status !== 'pending') {
    return { success: false, reason: '仅 pending 状态可批准' };
  }
  if (params.decision === 'rejected' && !['pending', 'approved'].includes(existing.status)) {
    return { success: false, reason: '当前状态不可拒绝' };
  }
  if (params.decision === 'issued' && existing.status !== 'approved') {
    return { success: false, reason: '需先 approved 才能 issued' };
  }
  if (params.decision === 'issued' && !params.invoiceUrl) {
    return { success: false, reason: 'issued 必须提供发票 PDF URL' };
  }

  const updates: Partial<InvoiceRequest> = {
    status: params.decision,
    admin_note: params.adminNote,
    processed_at: new Date().toISOString(),
    processed_by: params.adminId,
  };
  if (params.invoiceUrl) updates.invoice_url = params.invoiceUrl;

  const { data, error } = await supabaseAdmin
    .from('invoice_requests')
    .update(updates)
    .eq('id', params.invoiceId)
    .select()
    .maybeSingle();

  if (error || !data) {
    console.error('processInvoiceRequest error:', error);
    return { success: false, reason: error?.message || '处理失败' };
  }

  return { success: true, invoice: data as InvoiceRequest };
}

/**
 * 管理员: 列出所有发票申请 (按状态筛选)
 */
export async function listInvoiceRequests(filter?: {
  status?: InvoiceStatus;
  limit?: number;
  offset?: number;
}): Promise<{ invoices: InvoiceRequest[]; total: number }> {
  if (!supabaseAdmin) return { invoices: [], total: 0 };
  let query = supabaseAdmin
    .from('invoice_requests')
    .select('*', { count: 'exact' });
  if (filter?.status) query = query.eq('status', filter.status);
  query = query
    .order('created_at', { ascending: false })
    .range(filter?.offset || 0, (filter?.offset || 0) + (filter?.limit || 100) - 1);
  const { data, count } = await query;
  return { invoices: (data || []) as InvoiceRequest[], total: count || 0 };
}
