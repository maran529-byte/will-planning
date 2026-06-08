-- =============================================================================
-- aiwill-planner · 13 个 migrations 合并执行 (可重复跑)
--
-- 来源: /Users/maran/aiwill-planner/supabase/migrations/0001..0013
-- 用法: Supabase Dashboard → SQL Editor → New query → 粘贴本文件 → Run
--
-- 安全: 全部用 IF NOT EXISTS 包装, 可重复执行 (只补缺失的表/列/索引)
-- 适用: 已运行部分 migration 想补齐; 或全新数据库想一把初始化
--
-- 不安全: DROP / DELETE / TRUNCATE 全部没有, 不会丢数据
-- 大小: 约 1450 行, Supabase SQL Editor 单次可容纳
-- =============================================================================


-- =============================================================================
-- Migration 0001: 初始 Schema
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- user_status enum (仿 MySQL tinyint)
DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  openid TEXT UNIQUE,
  unionid TEXT,
  wechat_nickname TEXT,
  wechat_avatar_url TEXT,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  display_name TEXT,
  real_name_encrypted BYTEA,
  id_card_last4 CHAR(4),
  preferred_lang TEXT DEFAULT 'zh-CN',
  status user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_openid ON public.users(openid) WHERE openid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- 2. updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. handle_new_user trigger
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
  ON CONFLICT (id) DO UPDATE SET last_login_at = EXCLUDED.last_login_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  openid TEXT,
  plan TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  payment_intent_id TEXT,
  out_trade_no TEXT UNIQUE,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  questionnaire JSONB,
  will_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_out_trade_no ON public.orders(out_trade_no);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. lawyer_bookings
CREATE TABLE IF NOT EXISTS public.lawyer_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  lawyer_name TEXT,
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 30,
  meeting_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.lawyer_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.lawyer_bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled ON public.lawyer_bookings(scheduled_at);

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON public.lawyer_bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.lawyer_bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. wechat_cs_sessions
CREATE TABLE IF NOT EXISTS public.wechat_cs_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  openid TEXT,
  last_message_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cs_openid ON public.wechat_cs_sessions(openid) WHERE openid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cs_status ON public.wechat_cs_sessions(status);

DROP TRIGGER IF EXISTS trg_cs_sessions_updated_at ON public.wechat_cs_sessions;
CREATE TRIGGER trg_cs_sessions_updated_at
  BEFORE UPDATE ON public.wechat_cs_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. payment_events (1st definition in 0001, replaced by 0012)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  event_type TEXT NOT NULL,
  external_event_id TEXT,
  raw_payload JSONB,
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'received',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_order ON public.payment_events(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_status ON public.payment_events(status);

-- =============================================================================
-- Migration 0002: orders openid index
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_orders_openid ON public.orders(openid) WHERE openid IS NOT NULL;

-- =============================================================================
-- Migration 0003: role 字段 ⭐ 解决你当前报错的列
-- =============================================================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND constraint_name = 'users_role_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('user', 'lawyer', 'blogger', 'admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_role
  ON public.users(role)
  WHERE role != 'user';

COMMENT ON COLUMN public.users.role IS
  '用户角色: user (默认) | lawyer (P1) | blogger (Phase 4) | admin (Phase 3).';

-- =============================================================================
-- Migration 0004: 第一个 admin 创建说明
-- (不执行 SQL, 仅注释: 在 SQL Editor 跑 UPDATE 即可)
-- =============================================================================

-- =============================================================================
-- Migration 0005: bloggers
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.bloggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  contact_phone TEXT,
  bio TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  parent_blogger_id UUID REFERENCES public.bloggers(id) ON DELETE SET NULL,
  tier1_rate NUMERIC(5,4) NOT NULL DEFAULT 0.1000,
  tier2_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0300,
  status TEXT NOT NULL DEFAULT 'pending',
  reject_reason TEXT,
  total_earned_cents BIGINT NOT NULL DEFAULT 0,
  available_cents BIGINT NOT NULL DEFAULT 0,
  paid_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bloggers_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'disabled'))
);

CREATE INDEX IF NOT EXISTS idx_bloggers_status ON public.bloggers(status);
CREATE INDEX IF NOT EXISTS idx_bloggers_referral_code ON public.bloggers(referral_code);
CREATE INDEX IF NOT EXISTS idx_bloggers_parent ON public.bloggers(parent_blogger_id);

DROP TRIGGER IF EXISTS trg_bloggers_updated_at ON public.bloggers;
CREATE TRIGGER trg_bloggers_updated_at
  BEFORE UPDATE ON public.bloggers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 自动生成 6 位推广码
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  done BOOLEAN := FALSE;
BEGIN
  WHILE NOT done LOOP
    code := 'B' || upper(substring(md5(random()::text) from 1 for 6));
    done := NOT EXISTS(SELECT 1 FROM public.bloggers WHERE referral_code = code);
  END LOOP;
  RETURN code;
END;
$$;

-- =============================================================================
-- Migration 0006: affiliate_clicks
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blogger_id UUID NOT NULL REFERENCES public.bloggers(id) ON DELETE CASCADE,
  ref_code TEXT NOT NULL,
  ip INET,
  user_agent TEXT,
  referer TEXT,
  converted_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clicks_blogger ON public.affiliate_clicks(blogger_id);
CREATE INDEX IF NOT EXISTS idx_clicks_ref_code ON public.affiliate_clicks(ref_code);
CREATE INDEX IF NOT EXISTS idx_clicks_created ON public.affiliate_clicks(created_at DESC);

-- =============================================================================
-- Migration 0007: commissions
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blogger_id UUID NOT NULL REFERENCES public.bloggers(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tier SMALLINT NOT NULL CHECK (tier IN (1, 2)),
  rate NUMERIC(5,4) NOT NULL,
  amount_cents INTEGER NOT NULL,
  parent_blogger_id UUID REFERENCES public.bloggers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending_settlement',
  settled_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT commissions_status_check
    CHECK (status IN ('pending_settlement', 'available', 'paid', 'voided'))
);

CREATE INDEX IF NOT EXISTS idx_commissions_blogger ON public.commissions(blogger_id);
CREATE INDEX IF NOT EXISTS idx_commissions_order ON public.commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON public.commissions(status);

DROP TRIGGER IF EXISTS trg_commissions_updated_at ON public.commissions;
CREATE TRIGGER trg_commissions_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- Migration 0008: withdrawals
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blogger_id UUID NOT NULL REFERENCES public.bloggers(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 1000),
  method TEXT NOT NULL CHECK (method IN ('alipay', 'wechat', 'bank')),
  account_info JSONB NOT NULL,
  recipient_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reject_reason TEXT,
  processed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_proof_url TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT withdrawals_status_check
    CHECK (status IN ('pending', 'approved', 'paid', 'rejected', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_blogger ON public.withdrawals(blogger_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);

DROP TRIGGER IF EXISTS trg_withdrawals_updated_at ON public.withdrawals;
CREATE TRIGGER trg_withdrawals_updated_at
  BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- Migration 0009: RLS 策略
-- =============================================================================

-- bloggers: 用户只能看/改自己的博主记录
ALTER TABLE public.bloggers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bloggers_select_own ON public.bloggers;
CREATE POLICY bloggers_select_own ON public.bloggers
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS bloggers_insert_own ON public.bloggers;
CREATE POLICY bloggers_insert_own ON public.bloggers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS bloggers_update_own ON public.bloggers;
CREATE POLICY bloggers_update_own ON public.bloggers
  FOR UPDATE USING (auth.uid() = user_id);

-- commissions: 博主只能看自己的
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS commissions_select_own ON public.commissions;
CREATE POLICY commissions_select_own ON public.commissions
  FOR SELECT USING (
    blogger_id IN (SELECT id FROM public.bloggers WHERE user_id = auth.uid())
  );

-- withdrawals: 同上
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS withdrawals_select_own ON public.withdrawals;
CREATE POLICY withdrawals_select_own ON public.withdrawals
  FOR SELECT USING (
    blogger_id IN (SELECT id FROM public.bloggers WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS withdrawals_insert_own ON public.withdrawals;
CREATE POLICY withdrawals_insert_own ON public.withdrawals
  FOR INSERT WITH CHECK (
    blogger_id IN (SELECT id FROM public.bloggers WHERE user_id = auth.uid())
  );

-- affiliate_clicks: 只允许 service_role 写入, 用户可读自己的
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clicks_select_own ON public.affiliate_clicks;
CREATE POLICY clicks_select_own ON public.affiliate_clicks
  FOR SELECT USING (
    blogger_id IN (SELECT id FROM public.bloggers WHERE user_id = auth.uid())
  );

-- =============================================================================
-- Migration 0010: invoice_requests
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  invoice_type TEXT NOT NULL CHECK (invoice_type IN ('personal', 'company')),
  title TEXT NOT NULL,
  tax_id TEXT,
  email TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  issued_at TIMESTAMPTZ,
  invoice_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON public.invoice_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoice_requests(status);

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoice_requests;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoice_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- Migration 0011: ab_events
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ab_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment TEXT NOT NULL,
  variant TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click', 'conversion')),
  value_cents INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ab_events_experiment ON public.ab_events(experiment, variant);
CREATE INDEX IF NOT EXISTS idx_ab_events_user ON public.ab_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ab_events_session ON public.ab_events(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ab_events_created ON public.ab_events(created_at DESC);

-- =============================================================================
-- Migration 0012: payment_events (扩展, 复用 0001 的表)
-- =============================================================================

ALTER TABLE public.payment_events
  ADD COLUMN IF NOT EXISTS channel TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'received',
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS raw_payload JSONB;

-- 兼容旧 channel_data 字段
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='payment_events' AND column_name='channel_data') THEN
    UPDATE public.payment_events SET raw_payload = channel_data WHERE raw_payload IS NULL;
  END IF;
END $$;

-- =============================================================================
-- Migration 0013: 二级分销 (parent_blogger_id)
-- =============================================================================
ALTER TABLE public.commissions
  ADD COLUMN IF NOT EXISTS parent_blogger_id UUID REFERENCES public.bloggers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_commissions_parent ON public.commissions(parent_blogger_id) WHERE parent_blogger_id IS NOT NULL;

COMMENT ON COLUMN public.commissions.parent_blogger_id IS
  '上级博主 id (tier-2 才有值). 用于二级分销的 3% 佣金归属.';

-- =============================================================================
-- ✅ 执行完毕
-- 下一步: 在 SQL Editor 跑 UPDATE public.users SET role = 'admin' WHERE id = '...';
-- =============================================================================
