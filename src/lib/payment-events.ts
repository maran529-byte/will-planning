/**
 * 支付回调事件流水 (幂等性 + 审计).
 *
 * UNIQUE(channel, external_event_id) 约束保证:
 *  - 微信 V3 同一 transaction_id 多次回调只处理第一次
 *  - 支付宝同一 trade_no 多次回调只处理第一次
 *  - manual 模式: external_event_id = order_no + timestamp(ms), 实际上不会重发
 */
import { supabaseAdmin } from './supabase-server';
import { updateOrderStatusServer } from './orders';

export type Channel = 'wechat' | 'alipay' | 'manual';
export type Status = 'received' | 'processed' | 'failed' | 'ignored';

export interface PaymentEvent {
  id: string;
  channel: Channel;
  external_event_id: string;
  order_id: string | null;
  order_no: string | null;
  raw_payload: Record<string, unknown>;
  decrypted_payload: Record<string, unknown> | null;
  status: Status;
  error_message: string | null;
  processed_at: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
}

/**
 * 尝试记录一次回调事件. UNIQUE 冲突时返回已存在记录.
 *
 * 关键幂等性: 调用方需判断 isNew 来决定是否继续处理.
 */
export async function tryRecordEvent(params: {
  channel: Channel;
  externalEventId: string;
  orderNo: string;
  rawPayload: Record<string, unknown>;
  decryptedPayload?: Record<string, unknown>;
}): Promise<{ isNew: boolean; event: PaymentEvent }> {
  if (!supabaseAdmin) {
    throw new Error('supabaseAdmin not configured');
  }

  // 1. 先查 (避免 5xx 错误码暴露给上游)
  const { data: existing } = await supabaseAdmin
    .from('payment_events')
    .select('*')
    .eq('channel', params.channel)
    .eq('external_event_id', params.externalEventId)
    .maybeSingle();

  if (existing) {
    return { isNew: false, event: existing as PaymentEvent };
  }

  // 2. INSERT (可能因并发产生冲突, 失败时回退到查询)
  const { data, error } = await supabaseAdmin
    .from('payment_events')
    .insert({
      channel: params.channel,
      external_event_id: params.externalEventId,
      order_no: params.orderNo,
      raw_payload: params.rawPayload,
      decrypted_payload: params.decryptedPayload || null,
      status: 'received',
    })
    .select()
    .maybeSingle();

  if (error) {
    // UNIQUE 冲突 (并发场景) → 重新查询
    if (error.code === '23505') {
      const { data: existing2 } = await supabaseAdmin
        .from('payment_events')
        .select('*')
        .eq('channel', params.channel)
        .eq('external_event_id', params.externalEventId)
        .maybeSingle();
      if (existing2) return { isNew: false, event: existing2 as PaymentEvent };
    }
    throw new Error(`记录支付事件失败: ${error.message}`);
  }

  return { isNew: true, event: data as PaymentEvent };
}

/**
 * 关联订单 + 更新状态.
 */
export async function linkEventToOrder(eventId: string, orderId: string): Promise<void> {
  if (!supabaseAdmin) return;
  await supabaseAdmin
    .from('payment_events')
    .update({ order_id: orderId })
    .eq('id', eventId);
}

/**
 * 标记事件已处理 (成功/失败/忽略).
 */
export async function markEventProcessed(
  eventId: string,
  status: Exclude<Status, 'received'>,
  errorMessage?: string
): Promise<void> {
  if (!supabaseAdmin) return;
  await supabaseAdmin
    .from('payment_events')
    .update({
      status,
      error_message: errorMessage || null,
      processed_at: new Date().toISOString(),
    })
    .eq('id', eventId);
}

/**
 * 失败重试: 增加 attempts 计数 + 更新错误信息, 保持 status='failed' 给后台重试.
 *
 * 注: 通过先读后写实现 attempts 自增 (无 RPC 时).
 */
export async function markEventFailed(
  eventId: string,
  errorMessage: string
): Promise<void> {
  if (!supabaseAdmin) return;
  const { data } = await supabaseAdmin
    .from('payment_events')
    .select('attempts')
    .eq('id', eventId)
    .maybeSingle();
  await supabaseAdmin
    .from('payment_events')
    .update({
      status: 'failed',
      error_message: errorMessage,
      processed_at: new Date().toISOString(),
      attempts: (data?.attempts || 0) + 1,
    })
    .eq('id', eventId);
}

/**
 * 处理微信 V3 回调的业务逻辑:
 *  1. 记录事件 (幂等)
 *  2. 查订单, 校验存在
 *  3. 校验金额一致
 *  4. 校验订单状态 (必须是 pending)
 *  5. 调 updateOrderStatusServer (内部会触发佣金创建)
 *  6. 标记事件 processed / failed
 */
export async function processWechatV3Callback(params: {
  transactionId: string;
  outTradeNo: string;
  amountTotalFen: number;
  tradeState: string;
  decryptedPayload: Record<string, unknown>;
}): Promise<{ success: boolean; orderNo: string; reason?: string }> {
  if (!supabaseAdmin) {
    return { success: false, orderNo: params.outTradeNo, reason: 'DB 未配置' };
  }

  // 1. 记录事件
  const { isNew, event } = await tryRecordEvent({
    channel: 'wechat',
    externalEventId: params.transactionId,
    orderNo: params.outTradeNo,
    rawPayload: params.decryptedPayload,
    decryptedPayload: params.decryptedPayload,
  });

  if (!isNew) {
    // 已处理过, 直接返回
    if (event.status === 'processed') {
      return { success: true, orderNo: params.outTradeNo, reason: '已处理过 (幂等)' };
    }
    if (event.status === 'failed') {
      return { success: false, orderNo: params.outTradeNo, reason: '上次处理失败, 请人工介入' };
    }
    return { success: false, orderNo: params.outTradeNo, reason: `状态 ${event.status}` };
  }

  try {
    // 2. 查订单
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, order_no, amount, status')
      .eq('order_no', params.outTradeNo)
      .maybeSingle();

    if (!order) {
      await markEventProcessed(event.id, 'failed', '订单不存在');
      return { success: false, orderNo: params.outTradeNo, reason: '订单不存在' };
    }

    // 关联订单
    await linkEventToOrder(event.id, order.id);

    // 3. 金额校验 (微信 amount.total 单位: 分)
    if (params.amountTotalFen !== order.amount) {
      await markEventProcessed(
        event.id,
        'failed',
        `金额不一致: 微信 ${params.amountTotalFen} 分, 订单 ${order.amount} 分`
      );
      return {
        success: false,
        orderNo: params.outTradeNo,
        reason: '金额不一致',
      };
    }

    // 4. 状态校验
    if (order.status === 'paid') {
      await markEventProcessed(event.id, 'processed', '订单已 paid (幂等)');
      return { success: true, orderNo: params.outTradeNo, reason: '订单已 paid' };
    }
    if (order.status !== 'pending') {
      await markEventProcessed(
        event.id,
        'failed',
        `订单状态 ${order.status} 不可处理`
      );
      return {
        success: false,
        orderNo: params.outTradeNo,
        reason: `订单状态 ${order.status} 不可处理`,
      };
    }

    // 5. trade_state 校验 (微信 V3: SUCCESS / REFUND / ...)
    if (params.tradeState !== 'SUCCESS') {
      await markEventProcessed(
        event.id,
        'ignored',
        `trade_state=${params.tradeState}, 非 SUCCESS`
      );
      return {
        success: true,
        orderNo: params.outTradeNo,
        reason: `trade_state=${params.tradeState}, 不更新订单`,
      };
    }

    // 6. 更新订单状态 (内部会触发佣金)
    const updated = await updateOrderStatusServer(
      params.outTradeNo,
      'paid',
      'wechat'
    );

    if (!updated) {
      await markEventProcessed(event.id, 'failed', 'updateOrderStatusServer 返回 null');
      return { success: false, orderNo: params.outTradeNo, reason: '订单状态更新失败' };
    }

    // 7. 成功
    await markEventProcessed(event.id, 'processed');
    return { success: true, orderNo: params.outTradeNo };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    await markEventFailed(event.id, msg).catch(console.error);
    return { success: false, orderNo: params.outTradeNo, reason: msg };
  }
}
