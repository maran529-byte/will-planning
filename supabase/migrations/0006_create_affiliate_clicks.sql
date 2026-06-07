-- =============================================================================
-- Migration 0006: 推广点击流水表 (affiliate_clicks)
-- =============================================================================
-- 记录每次 ?ref=xxx 推广链接的点击. 用于:
--  1. 反作弊: 同 IP 短时间内大量点击 → 警告
--  2. 转化分析: 点击 → 注册 → 下单 → 支付
--  3. 博主 dashboard 的「点击数」统计
--
-- 字段:
--   id              BIGSERIAL 主键 (高写入量, 不必 UUID)
--   ref_code        推广码 (无 FK 约束, 允许博主被删除后保留历史)
--   blogger_id      关联 blogger (approved 后由 trigger 回填, 创建时可能为 NULL)
--   ip              来源 IP (审计)
--   user_agent      UA (审计)
--   landing_path    落地路径 (例: /questionnaire)
--   openid          如果用户在 30 天内绑定了 openid, 反向回填 (用于转化归因)
--   converted_at    如果该点击最终产生了 paid 订单, 记录时间
--   order_id        关联订单 (paid 后回填)
-- =============================================================================

CREATE TABLE public.affiliate_clicks (
  id BIGSERIAL PRIMARY KEY,

  ref_code TEXT NOT NULL,                            -- 推广码 (无 FK, 历史保留)
  blogger_id UUID REFERENCES public.bloggers(id) ON DELETE SET NULL,  -- 博主 (审核后回填)

  ip INET,                                           -- 来源 IP
  user_agent TEXT,                                   -- UA
  landing_path TEXT NOT NULL,                        -- 落地路径

  -- 转化归因 (后续回填)
  openid TEXT,                                       -- 用户 openid (回填)
  converted_at TIMESTAMPTZ,                          -- 转化时间 (paid 订单时回填)
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX idx_clicks_ref_code ON public.affiliate_clicks(ref_code, created_at DESC);
CREATE INDEX idx_clicks_blogger_id ON public.affiliate_clicks(blogger_id, created_at DESC);
CREATE INDEX idx_clicks_ip ON public.affiliate_clicks(ip, created_at DESC);  -- 反作弊
CREATE INDEX idx_clicks_converted ON public.affiliate_clicks(converted_at) WHERE converted_at IS NOT NULL;
CREATE INDEX idx_clicks_order_id ON public.affiliate_clicks(order_id) WHERE order_id IS NOT NULL;

COMMENT ON TABLE public.affiliate_clicks IS '推广点击流水. 记录 ?ref=xxx 链接的每次访问, 用于反作弊 + 转化分析';
COMMENT ON COLUMN public.affiliate_clicks.blogger_id IS '博主 ID, 由应用层在写入时回填 (因为 ref_code 在写入时尚未确定 blogger_id)';

-- =============================================================================
-- RLS 策略
-- =============================================================================
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- 前端不可读 (防泄漏 IP/UA). 仅 service_role 后端 API 读.
-- 故不创建 SELECT 策略

-- 用户可 INSERT 自己的点击 (openid 字段), 用于「我点击过的推广」追溯
-- 注: 实际写入由 middleware / 公开 API 完成, 不是用户直接 INSERT
-- 故不创建 INSERT 策略

-- =============================================================================
-- End of 0006_create_affiliate_clicks.sql
-- =============================================================================
