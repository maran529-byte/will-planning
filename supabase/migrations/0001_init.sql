-- =============================================================================
-- AI Will Planner · Supabase 初始 Schema
-- 数据库: Supabase OSS 自托管 (腾讯云 CVM 大陆节点)
-- 合规: 用户/订单 PII 落大陆, HK Vercel 仅无状态 API 层
-- 标准: PostgreSQL 15 + Supabase GoTrue (auth) + RLS 行级安全
-- =============================================================================

-- =============================================================================
-- 0. 必要扩展
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";     -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- gen_random_uuid(), crypt()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- 文本模糊搜索 (备用)
CREATE EXTENSION IF NOT EXISTS "citext";         -- 不区分大小写文本 (email)

-- =============================================================================
-- 1. 枚举类型
-- =============================================================================
CREATE TYPE user_status AS ENUM ('active', 'banned', 'deleted');

CREATE TYPE order_product AS ENUM (
  'will_basic',         -- 基础遗嘱 ¥19.9
  'will_standard',      -- 标准遗嘱 ¥999
  'will_pro',           -- 专业遗嘱 ¥4699
  'lawyer_consult'      -- 律师咨询 (面议)
);

CREATE TYPE payment_channel AS ENUM (
  'alipay_h5',          -- 支付宝 H5
  'wechat_h5',          -- 微信 H5 支付
  'stripe',             -- Stripe (境外)
  'bank_transfer',      -- 对公转账
  'free'                -- 免费 (如宣传期)
);

CREATE TYPE payment_status AS ENUM (
  'created',            -- 已创建, 未支付
  'paid',               -- 已支付
  'refunded',           -- 已退款
  'failed',             -- 支付失败
  'cancelled'           -- 用户取消
);

CREATE TYPE fulfillment_status AS ENUM (
  'pending',            -- 待处理
  'in_progress',        -- 处理中
  'completed',          -- 已完成
  'rejected'            -- 已拒绝 (律师拒绝接单等)
);

CREATE TYPE booking_status AS ENUM (
  'pending',            -- 待确认
  'confirmed',          -- 已确认
  'completed',          -- 已完成
  'cancelled',          -- 已取消
  'no_show'             -- 客户未到场
);

-- =============================================================================
-- 2. 核心用户表 (与 Supabase auth.users 关联)
-- =============================================================================
-- 说明: Supabase auth.users 由 GoTrue 自动管理, 我们在 public.users 扩展业务字段
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 微信绑定字段
  openid TEXT UNIQUE,                              -- 微信 OpenID (主绑定键)
  unionid TEXT,                                    -- 微信 UnionID (跨公众号共享)
  wechat_nickname TEXT,
  wechat_avatar_url TEXT,

  -- 基础信息
  phone TEXT UNIQUE,                               -- 手机号 (可选, 客服联系用)
  email TEXT UNIQUE,                               -- 邮箱 (可选)
  display_name TEXT,                               -- 显示昵称 (优先 wechat_nickname)
  real_name_encrypted BYTEA,                       -- 真实姓名 (PII 加密存储, 用 pgcrypto)
  id_card_last4 CHAR(4),                           -- 身份证后 4 位 (用于客服核对)

  -- 偏好
  preferred_lang TEXT DEFAULT 'zh-CN',

  -- 状态
  status user_status NOT NULL DEFAULT 'active',

  -- 审计
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_users_openid ON public.users(openid) WHERE openid IS NOT NULL;
CREATE INDEX idx_users_phone ON public.users(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_email ON public.users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_created_at ON public.users(created_at DESC);
CREATE INDEX idx_users_status ON public.users(status) WHERE status != 'active';

COMMENT ON COLUMN public.users.real_name_encrypted IS 'PII 加密字段, 用 pgp_sym_encrypt(real_name, current_setting(''app.pii_key''))';
COMMENT ON COLUMN public.users.id_card_last4 IS '仅存后 4 位, 用于客服核对, 不存全卡号';

-- =============================================================================
-- 3. 订单表
-- =============================================================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,

  -- 商品
  product_code order_product NOT NULL,
  product_name TEXT NOT NULL,                       -- 中文名 (快照, 防止商品改名影响历史)
  amount_cents INT NOT NULL CHECK (amount_cents >= 0),  -- 单位: 分 (1990, 99900, 469900)
  currency CHAR(3) NOT NULL DEFAULT 'CNY',

  -- 支付
  payment_channel payment_channel,
  payment_status payment_status NOT NULL DEFAULT 'created',
  external_trade_no TEXT,                          -- 支付宝/微信 out_trade_no (幂等键)
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_amount_cents INT CHECK (refund_amount_cents IS NULL OR refund_amount_cents >= 0),

  -- 业务履约
  fulfillment_status fulfillment_status NOT NULL DEFAULT 'pending',
  will_document_url TEXT,                          -- 生成的 PDF 遗嘱 (Supabase Storage 路径)
  questionnaire_snapshot JSONB,                    -- 问卷填写快照 (避免历史订单因表单改动失真)

  -- 来源
  referrer TEXT,                                    -- 渠道追踪 (公众号菜单, 二维码, H5 直访)
  source_ip INET,                                   -- 付款时的客户端 IP (审计)

  -- 审计
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(payment_status, fulfillment_status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_orders_external_trade_no ON public.orders(external_trade_no) WHERE external_trade_no IS NOT NULL;
CREATE INDEX idx_orders_product_code ON public.orders(product_code);
CREATE INDEX idx_orders_paid_at ON public.orders(paid_at DESC) WHERE paid_at IS NOT NULL;

COMMENT ON TABLE public.orders IS '订单主表, 含支付状态与履约状态. 状态机见 docs/PRD.md';

-- =============================================================================
-- 4. 律师预约表
-- =============================================================================
CREATE TABLE public.lawyer_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,

  lawyer_id TEXT NOT NULL,                         -- 律师 ID (从律师列表配置)
  lawyer_name TEXT NOT NULL,                       -- 律师姓名 (快照)

  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),

  contact_phone TEXT NOT NULL,                     -- 联系手机 (必填, 律师会打这个电话)
  contact_name TEXT NOT NULL,                      -- 联系人姓名

  notes TEXT,                                       -- 用户备注
  status booking_status NOT NULL DEFAULT 'pending',

  -- 律师侧记录
  lawyer_notes TEXT,
  meeting_url TEXT,                                 -- 视频会议链接 (Zoom/腾讯会议)

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_user_id ON public.lawyer_bookings(user_id);
CREATE INDEX idx_bookings_lawyer_id ON public.lawyer_bookings(lawyer_id);
CREATE INDEX idx_bookings_scheduled_at ON public.lawyer_bookings(scheduled_at);
CREATE INDEX idx_bookings_status ON public.lawyer_bookings(status) WHERE status NOT IN ('completed', 'cancelled');

-- =============================================================================
-- 5. 公众号客服消息 48h 窗口追踪
-- =============================================================================
CREATE TABLE public.wechat_cs_sessions (
  openid TEXT PRIMARY KEY,                          -- 微信 OpenID (主键, 1 用户 1 会话)
  last_user_msg_at TIMESTAMPTZ NOT NULL,           -- 48h 窗口起点
  last_bot_msg_at TIMESTAMPTZ,                     -- 最后一次发客服消息的时间
  last_menu_key TEXT,                              -- 上次点击的菜单 key
  msg_count INT NOT NULL DEFAULT 1,                -- 累计互动次数 (用于风控)

  -- 上下文 (用于恢复对话状态)
  context JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cs_sessions_window ON public.wechat_cs_sessions(last_user_msg_at);
CREATE INDEX idx_cs_sessions_updated_at ON public.wechat_cs_sessions(updated_at DESC);

COMMENT ON TABLE public.wechat_cs_sessions IS '公众号 48h 客服消息窗口追踪. 个人订阅号无模板消息, 推送前必查 last_user_msg_at';
COMMENT ON COLUMN public.wechat_cs_sessions.msg_count IS '累计互动次数, 用于识别刷量用户';

-- =============================================================================
-- 6. 支付流水表 (幂等 + 审计)
-- =============================================================================
CREATE TABLE public.payment_events (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  channel payment_channel NOT NULL,

  -- 事件类型
  event_type TEXT NOT NULL,                        -- trade_created / trade_paid / trade_refunded / trade_closed
  external_event_id TEXT,                          -- 平台事件 ID (幂等键)

  -- 原始 payload (用于审计 + 调试)
  raw_payload JSONB NOT NULL,

  -- 处理结果
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  error_message TEXT,

  UNIQUE (channel, external_event_id)              -- 同一平台同一事件只处理一次
);

CREATE INDEX idx_payment_events_order_id ON public.payment_events(order_id);
CREATE INDEX idx_payment_events_processed_at ON public.payment_events(processed_at DESC);

COMMENT ON TABLE public.payment_events IS '支付事件流水, 用于幂等处理 + 审计 + 调试';

-- =============================================================================
-- 7. 触发器: updated_at 自动维护
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.lawyer_bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_cs_sessions_updated_at
  BEFORE UPDATE ON public.wechat_cs_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 8. 触发器: 新用户注册自动创建 public.users 行
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, display_name, last_login_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.last_sign_in_at
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- GoTrue 通过 auth.users 触发, 监听 INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 9. RLS (Row Level Security) 行级安全策略
-- =============================================================================

-- 9.1 启用 RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyer_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wechat_cs_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- 9.2 users 表策略
-- 用户能读自己的行
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- 用户能更新自己的行 (限制: 不可改 status, real_name_encrypted, openid)
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND status = (SELECT u.status FROM public.users u WHERE u.id = auth.uid())
    AND openid IS NOT DISTINCT FROM (SELECT u.openid FROM public.users u WHERE u.id = auth.uid())
  );

-- 9.3 orders 表策略
-- 用户能读自己的订单
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

-- 用户能创建自己的订单 (后端 service_role 也可)
CREATE POLICY "orders_insert_own" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户不能直接改订单 (所有状态变更走后端 service_role)
-- 故不创建 orders_update 策略

-- 9.4 lawyer_bookings 表策略
CREATE POLICY "bookings_select_own" ON public.lawyer_bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "bookings_insert_own" ON public.lawyer_bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9.5 wechat_cs_sessions 表策略
-- 仅后端 service_role 可读写 (前端不直接接触)
-- 不创建 SELECT/INSERT/UPDATE 策略 → 任何 anon/authenticated 都不能操作

-- 9.6 payment_events 表策略
-- 仅后端 service_role 可读写
-- 不创建策略

-- 9.7 service_role 说明
-- Supabase service_role key 默认绕过 RLS, 用于后端
-- anon key + authenticated key 受 RLS 约束

-- =============================================================================
-- 10. 辅助视图 (供 H5 业务查询)
-- =============================================================================

-- 10.1 用户订单摘要
CREATE OR REPLACE VIEW public.v_user_orders AS
SELECT
  o.id,
  o.user_id,
  o.product_code,
  o.product_name,
  o.amount_cents,
  o.currency,
  o.payment_status,
  o.fulfillment_status,
  o.will_document_url,
  o.created_at,
  o.paid_at
FROM public.orders o
WHERE o.user_id = auth.uid();

COMMENT ON VIEW public.v_user_orders IS '用户订单摘要, RLS 自动应用';

-- 10.2 待办律师预约 (给运营/律师后台用)
CREATE OR REPLACE VIEW public.v_pending_bookings AS
SELECT
  b.id,
  b.user_id,
  b.lawyer_id,
  b.lawyer_name,
  b.scheduled_at,
  b.contact_phone,
  b.contact_name,
  b.notes,
  b.created_at
FROM public.lawyer_bookings b
WHERE b.status = 'pending';

COMMENT ON VIEW public.v_pending_bookings IS '待确认律师预约列表';

-- =============================================================================
-- 11. 辅助函数
-- =============================================================================

-- 11.1 检查 48h 客服消息窗口是否开启
CREATE OR REPLACE FUNCTION public.can_send_cs_message(p_openid TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_last_at TIMESTAMPTZ;
BEGIN
  SELECT last_user_msg_at INTO v_last_at
  FROM public.wechat_cs_sessions
  WHERE openid = p_openid;

  IF v_last_at IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN (now() - v_last_at) < INTERVAL '48 hours';
END;
$$;

-- 11.2 创建订单 (供后端调用, 含幂等)
CREATE OR REPLACE FUNCTION public.create_order(
  p_user_id UUID,
  p_product_code order_product,
  p_product_name TEXT,
  p_amount_cents INT,
  p_questionnaire JSONB DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
BEGIN
  INSERT INTO public.orders (
    user_id, product_code, product_name, amount_cents,
    questionnaire_snapshot, referrer
  )
  VALUES (
    p_user_id, p_product_code, p_product_name, p_amount_cents,
    p_questionnaire, p_referrer
  )
  RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;

COMMENT ON FUNCTION public.create_order IS '创建订单, 自动设置状态为 created, 返回订单 ID';

-- 11.3 标记订单已支付 (供支付回调调用, 幂等)
CREATE OR REPLACE FUNCTION public.mark_order_paid(
  p_order_id UUID,
  p_channel payment_channel,
  p_external_trade_no TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affected INT;
BEGIN
  UPDATE public.orders
  SET payment_status = 'paid',
      payment_channel = p_channel,
      external_trade_no = p_external_trade_no,
      paid_at = now(),
      fulfillment_status = CASE
        WHEN fulfillment_status = 'pending' THEN 'in_progress'::fulfillment_status
        ELSE fulfillment_status
      END
  WHERE id = p_order_id
    AND payment_status = 'created';

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN v_affected > 0;
END;
$$;

COMMENT ON FUNCTION public.mark_order_paid IS '幂等标记订单已支付, 仅 created → paid 转换, 返回是否真正修改';

-- =============================================================================
-- 12. Storage bucket (PDF 遗嘱 + 身份证附件)
-- =============================================================================
-- 注: Supabase Storage buckets 在 docker-compose 中预创建, 这里只是注释
-- 实际创建在 supabase/docker/volumes/storage/ 中, 见 setup-supabase.sh

-- =============================================================================
-- 13. 种子数据 (可选, 仅开发环境)
-- =============================================================================
-- 在生产环境注释掉, 开发环境可解开用于测试
-- INSERT INTO public.users (id, display_name) VALUES
--   ('00000000-0000-0000-0000-000000000001', '测试用户');

-- =============================================================================
-- End of 0001_init.sql
-- =============================================================================
