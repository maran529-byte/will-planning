-- =============================================================================
-- Migration 0007: 佣金记录表 (commissions)
-- =============================================================================
-- 每笔 paid 订单对应 0~1 条 commission 记录.
-- 状态机:
--   pending  → 订单 paid 后立即写入, 状态 pending (T+7 防退款, 7 天后变 available)
--   available → 7 天后自动变 available, 可申请提现
--   withdrawn → 用户申请提现, 管理员审批通过后变 withdrawn (已转账)
--   voided   → 订单退款时变 voided (佣金被撤回, 不计入可提现)
--
-- 字段:
--   id              UUID 主键
--   blogger_id      博主
--   order_id        关联订单 (UNIQUE, 一笔订单只产生一条佣金)
--   order_amount_cents 订单金额 (快照)
--   rate            佣金比例 (basis points, 1000 = 10%)
--   commission_cents 佣金金额 (order_amount * rate / 10000)
--   status          pending/available/withdrawn/voided
--   available_at    T+7 后变 available 的时间
--   voided_at       退款时间
--   voided_reason   退款原因
--   created_at      创建时间
-- =============================================================================

CREATE TYPE commission_status AS ENUM (
  'pending',         -- T+7 防退款期内
  'available',       -- 可提现
  'withdrawn',       -- 已提现 (管理员审批通过)
  'voided'           -- 已撤回 (订单退款)
);

CREATE TABLE public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  blogger_id UUID NOT NULL REFERENCES public.bloggers(id) ON DELETE CASCADE,
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,  -- 1 订单 1 佣金

  -- 快照 (博主佣金比例可能调整, 历史订单保留原比例)
  order_amount_cents INT NOT NULL CHECK (order_amount_cents >= 0),
  rate INT NOT NULL CHECK (rate BETWEEN 0 AND 5000),
  commission_cents INT NOT NULL CHECK (commission_cents >= 0),

  -- 状态
  status commission_status NOT NULL DEFAULT 'pending',
  available_at TIMESTAMPTZ NOT NULL,                -- pending → available 的时间 (created_at + 7 days)

  -- 撤回信息 (退款时填)
  voided_at TIMESTAMPTZ,
  voided_reason TEXT,

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX idx_commissions_blogger_id ON public.commissions(blogger_id, created_at DESC);
CREATE INDEX idx_commissions_status ON public.commissions(status) WHERE status IN ('pending', 'available');
CREATE INDEX idx_commissions_order_id ON public.commissions(order_id);
CREATE INDEX idx_commissions_available_at ON public.commissions(available_at) WHERE status = 'pending';

CREATE TRIGGER trg_commissions_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.commissions IS '佣金记录. 1 订单 1 条, 状态机 pending → available/voided → withdrawn';
COMMENT ON COLUMN public.commissions.rate IS '佣金比例 (basis points 快照). 即使博主后续调整佣金率, 历史订单保留原比例';
COMMENT ON COLUMN public.commissions.available_at IS 'T+7 后变 available. 防退款: 7 天内退款的订单, 佣金直接 voided';

-- =============================================================================
-- RLS 策略
-- =============================================================================
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- 博主可读自己的佣金
CREATE POLICY "commissions_select_own" ON public.commissions
  FOR SELECT USING (
    blogger_id IN (SELECT id FROM public.bloggers WHERE user_id = auth.uid())
  );

-- =============================================================================
-- 触发器: T+7 后自动 pending → available
-- =============================================================================
-- 注: PostgreSQL 没有原生定时任务, 需配合外部 cron (pg_cron) 或应用层定时任务.
-- 这里用应用层兜底: 每次博主 dashboard 加载时, 批量更新过期的 pending → available.
-- (详见 src/lib/affiliate.ts 的 syncCommissionAvailability() 函数)
--
-- 未来优化: 启用 Supabase pg_cron 扩展后, 可加:
--   SELECT cron.schedule('sync-commissions', '0 */6 * * *',
--     $$UPDATE commissions SET status='available'
--       WHERE status='pending' AND available_at < now()$$);

-- =============================================================================
-- 辅助函数: 退款时撤回佣金
-- =============================================================================
CREATE OR REPLACE FUNCTION public.void_commission_for_order(p_order_id UUID, p_reason TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affected INT;
BEGIN
  UPDATE public.commissions
  SET status = 'voided',
      voided_at = now(),
      voided_reason = p_reason,
      updated_at = now()
  WHERE order_id = p_order_id
    AND status IN ('pending', 'available');

  GET DIAGNOSTICS v_affected = ROW_COUNT;

  -- 同步更新博主 available_cents (减去被 voided 的金额)
  IF v_affected > 0 THEN
    UPDATE public.bloggers b
    SET available_cents = GREATEST(0, b.available_cents - c.commission_cents)
    FROM public.commissions c
    WHERE c.order_id = p_order_id
      AND c.blogger_id = b.id
      AND c.status = 'voided';
  END IF;

  RETURN v_affected > 0;
END;
$$;

COMMENT ON FUNCTION public.void_commission_for_order IS '订单退款时调用, 将对应佣金 voided 并扣减博主可用余额. 幂等.';

-- =============================================================================
-- 辅助函数: 提升 pending → available
-- =============================================================================
CREATE OR REPLACE FUNCTION public.sync_commission_availability()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  -- 1. 更新状态 pending → available
  WITH updated AS (
    UPDATE public.commissions
    SET status = 'available',
        updated_at = now()
    WHERE status = 'pending'
      AND available_at <= now()
    RETURNING blogger_id, commission_cents
  )
  SELECT count(*) INTO v_count FROM updated;

  -- 2. 累加博主 available_cents
  IF v_count > 0 THEN
    UPDATE public.bloggers b
    SET available_cents = b.available_cents + sub.total
    FROM (
      SELECT blogger_id, SUM(commission_cents) AS total
      FROM public.commissions
      WHERE status = 'available'
      GROUP BY blogger_id
    ) sub
    WHERE b.id = sub.blogger_id;
  END IF;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.sync_commission_availability IS '将过期 pending 佣金批量提升为 available, 累加博主余额. 每次 dashboard 加载时调用';

-- =============================================================================
-- End of 0007_create_commissions.sql
-- =============================================================================
