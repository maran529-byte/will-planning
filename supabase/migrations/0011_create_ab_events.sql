-- =============================================================================
-- 0011: A/B 测试事件表
-- 业务: 通过 cookie 分配变体, 记录 impression/click/conversion 事件
-- 时间: 2026-06-07
-- =============================================================================

CREATE TYPE ab_event_type AS ENUM ('impression', 'click', 'conversion');

CREATE TABLE public.ab_events (
  id BIGSERIAL PRIMARY KEY,
  experiment_name TEXT NOT NULL,                     -- 实验名 (如 'payment_cta_v1')
  variant TEXT NOT NULL,                             -- 变体 (如 'A' / 'B' / 'C')
  event_type ab_event_type NOT NULL,
  user_key TEXT NOT NULL,                            -- 匿名 ID: openid 或 cookie 随机 ID
  value NUMERIC,                                     -- 可选: 转化金额 (分)
  path TEXT,                                         -- 当前路径 (归因)
  metadata JSONB,                                    -- 额外元数据
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 加速聚合查询
CREATE INDEX idx_ab_exp_variant_event ON public.ab_events(experiment_name, variant, event_type, created_at DESC);
CREATE INDEX idx_ab_exp_created_at ON public.ab_events(experiment_name, created_at DESC);
CREATE INDEX idx_ab_user_key ON public.ab_events(user_key);

COMMENT ON TABLE public.ab_events IS 'A/B 测试事件流. 分配通过 cookie 哈希, 事件通过 /api/ab/event 上报';

-- RLS: 关 (服务端 SERVICE_ROLE 全权访问)
ALTER TABLE public.ab_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.ab_events
  FOR ALL USING (true) WITH CHECK (true);
