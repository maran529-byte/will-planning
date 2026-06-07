-- =============================================================================
-- 0012: 支付回调事件流水表 (幂等性 + 审计)
-- 业务: 微信/支付宝回调事件流. 同一 transaction_id 多次回调只处理一次.
-- 时间: 2026-06-07
-- =============================================================================

CREATE TYPE payment_event_channel AS ENUM ('wechat', 'alipay', 'manual');
CREATE TYPE payment_event_status AS ENUM ('received', 'processed', 'failed', 'ignored');

CREATE TABLE public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel payment_event_channel NOT NULL,
  -- 微信 V3: transaction_id; 支付宝: trade_no; manual: 内部 event_id
  external_event_id TEXT NOT NULL,
  -- 业务订单号
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  order_no TEXT,

  -- 原始 payload (用于审计 / 重放)
  raw_payload JSONB NOT NULL,
  -- 解密后结构化数据 (V3 回调的 resource 解密后)
  decrypted_payload JSONB,

  status payment_event_status NOT NULL DEFAULT 'received',
  error_message TEXT,

  -- 处理标记
  processed_at TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 幂等键: 同一 channel + external_event_id 只处理一次
  CONSTRAINT uq_payment_event_channel_id UNIQUE (channel, external_event_id)
);

CREATE INDEX idx_payment_event_order_id ON public.payment_events(order_id);
CREATE INDEX idx_payment_event_status ON public.payment_events(status) WHERE status IN ('received', 'failed');
CREATE INDEX idx_payment_event_created_at ON public.payment_events(created_at DESC);

COMMENT ON TABLE public.payment_events IS '支付回调事件流水. UNIQUE(channel, external_event_id) 保证幂等性';

-- RLS 关
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.payment_events
  FOR ALL USING (true) WITH CHECK (true);

-- 触发器
CREATE TRIGGER trg_payment_event_updated_at
  BEFORE UPDATE ON public.payment_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
