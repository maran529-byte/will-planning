-- =============================================================================
-- Migration 0005: 博主申请表 (bloggers)
-- =============================================================================
-- 博主(推广者)主表. 用户通过 /affiliate 申请, 管理员审核后获得专属 ref_code.
-- ref_code 唯一, 形如 B + 6 位大写字母数字 (例: BX7K2QM), 用于推广链接 ?ref=BX7K2QM.
--
-- 字段:
--   id              UUID 主键
--   user_id         关联 auth.users (1 个用户 1 个博主申请)
--   ref_code        唯一推广码 (审核通过后生成)
--   display_name    公开显示名 (审核通过后展示在「我们的推广伙伴」)
--   contact_phone   联系手机 (脱敏后存, 用于结算转账)
--   bio             简介 (公开, 200 字内)
--   avatar_url      头像 (公开)
--   status          pending/approved/rejected/disabled
--   commission_rate 佣金比例 (basis points, 1000 = 10%; 默认 1000)
--   applied_at      申请时间
--   reviewed_at     审核时间
--   reviewed_by     审核管理员 (auth.users.id)
--   review_note     审核备注 (拒绝时填写原因)
--   total_earned_cents 累计已赚佣金 (冗余字段, 加速 dashboard 渲染)
--   total_withdrawn_cents 累计已提现金额
-- =============================================================================

CREATE TYPE blogger_status AS ENUM (
  'pending',           -- 待审核
  'approved',          -- 已通过
  'rejected',          -- 已拒绝
  'disabled'           -- 已禁用 (有违规行为)
);

CREATE TABLE public.bloggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 关联用户 (1 个用户 1 个博主申请, UNIQUE 约束)
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 推广码 (审核通过后才填, UNIQUE)
  ref_code TEXT UNIQUE,

  -- 公开资料
  display_name TEXT,
  contact_phone TEXT,                                 -- 联系手机 (脱敏)
  bio TEXT CHECK (bio IS NULL OR length(bio) <= 200),
  avatar_url TEXT,

  -- 状态
  status blogger_status NOT NULL DEFAULT 'pending',
  commission_rate INT NOT NULL DEFAULT 1000 CHECK (commission_rate BETWEEN 0 AND 5000),  -- 0% ~ 50%, basis points

  -- 审计
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  review_note TEXT,

  -- 冗余统计 (供 dashboard 加速渲染)
  total_earned_cents BIGINT NOT NULL DEFAULT 0 CHECK (total_earned_cents >= 0),
  total_withdrawn_cents BIGINT NOT NULL DEFAULT 0 CHECK (total_withdrawn_cents >= 0),
  available_cents BIGINT NOT NULL DEFAULT 0 CHECK (available_cents >= 0),  -- 累计 - 已提现 (T+7 前的 pending 不计入)

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX idx_bloggers_ref_code ON public.bloggers(ref_code) WHERE ref_code IS NOT NULL;
CREATE INDEX idx_bloggers_status ON public.bloggers(status) WHERE status IN ('pending', 'approved');
CREATE INDEX idx_bloggers_user_id ON public.bloggers(user_id);

-- updated_at 自动维护
CREATE TRIGGER trg_bloggers_updated_at
  BEFORE UPDATE ON public.bloggers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.bloggers IS '博主/推广者主表. 用户通过 /affiliate 申请, 管理员审核后获得专属 ref_code';
COMMENT ON COLUMN public.bloggers.commission_rate IS '佣金比例 (basis points). 1000 = 10%, 1500 = 15%. 范围 0-5000 (0-50%)';
COMMENT ON COLUMN public.bloggers.ref_code IS '推广码. 形如 B + 6 位大写字母数字. 审核通过后由 generate_ref_code() 生成';

-- =============================================================================
-- 辅助函数: 生成唯一 ref_code
-- =============================================================================
CREATE OR REPLACE FUNCTION public.generate_ref_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- 去掉 0/O/1/I/L 等易混淆字符
  v_code TEXT;
  v_attempts INT := 0;
BEGIN
  LOOP
    v_attempts := v_attempts + 1;
    v_code := 'B';
    FOR i IN 1..6 LOOP
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::INT, 1);
    END LOOP;
    -- 唯一性检查
    IF NOT EXISTS (SELECT 1 FROM public.bloggers WHERE ref_code = v_code) THEN
      RETURN v_code;
    END IF;
    -- 防死循环 (理论不会发生, 32^6 = 1073741824)
    IF v_attempts > 100 THEN
      RAISE EXCEPTION 'ref_code generation failed after 100 attempts';
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.generate_ref_code IS '生成 7 位推广码 (B + 6 字符, 排除易混淆字符)';

-- =============================================================================
-- RLS 策略
-- =============================================================================
ALTER TABLE public.bloggers ENABLE ROW LEVEL SECURITY;

-- 用户可读自己的博主申请 (包括 pending/rejected 状态)
CREATE POLICY "bloggers_select_own" ON public.bloggers
  FOR SELECT USING (auth.uid() = user_id);

-- 用户可 INSERT 自己的申请 (只能 1 条, 由 UNIQUE 约束保证)
CREATE POLICY "bloggers_insert_own" ON public.bloggers
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- 用户可 UPDATE 自己的申请, 但禁止改 status/commission_rate/ref_code/reviewed_*
-- (即: pending 状态可改 display_name/bio/avatar_url; 非 pending 状态禁止修改)
CREATE POLICY "bloggers_update_own_pending" ON public.bloggers
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND ref_code IS NULL
    AND reviewed_at IS NULL
    AND reviewed_by IS NULL
  );

-- 管理员 (role='admin') 可读所有 (绕过: service_role)
-- 注: anon/authenticated key 受 RLS 约束, 管理员走 service_role 后端 API
-- 故不创建 admin_select 策略 (前端不需要直接查所有博主)

-- =============================================================================
-- End of 0005_create_bloggers.sql
-- =============================================================================
