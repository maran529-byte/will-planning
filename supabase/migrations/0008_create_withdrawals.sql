-- =============================================================================
-- Migration 0008: 提现申请表 (withdrawals)
-- =============================================================================
-- 博主申请提现记录. 每次提现申请 1 条.
-- 状态机:
--   pending  → 用户提交申请, 等待管理员审批
--   approved → 管理员已审批, 待打款
--   paid     → 已打款, 完成
--   rejected → 拒绝 (余额退回)
--   cancelled → 用户主动撤销 (在 pending 状态)
--
-- 字段:
--   id              UUID 主键
--   blogger_id      博主
--   amount_cents    申请金额 (分)
--   commission_ids  关联的 commission ID 列表 (JSONB array)
--   status          pending/approved/paid/rejected/cancelled
--   contact_info    打款信息 (脱敏后的支付宝账号/银行卡号/微信)
--   contact_method  alipay/wechat/bank
--   requested_at    申请时间
--   processed_at    处理时间
--   processed_by    处理管理员
--   process_note    处理备注 (拒绝原因, 打款流水号等)
--   payment_proof_url  打款凭证 (管理员上传的转账截图, Supabase Storage 路径)
-- =============================================================================

CREATE TYPE withdrawal_status AS ENUM (
  'pending',         -- 待审批
  'approved',        -- 已审批待打款
  'paid',            -- 已打款
  'rejected',        -- 已拒绝 (余额退回)
  'cancelled'        -- 用户撤销
);

CREATE TYPE withdrawal_method AS ENUM (
  'alipay',          -- 支付宝
  'wechat',          -- 微信
  'bank'             -- 银行卡
);

CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  blogger_id UUID NOT NULL REFERENCES public.bloggers(id) ON DELETE CASCADE,

  -- 金额
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),  -- 单位分, 最小 ¥10 = 1000

  -- 关联的 commission 列表 (JSONB array of UUIDs)
  -- 提现时这些 commissions 状态从 available → withdrawn
  commission_ids JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- 打款信息
  contact_method withdrawal_method NOT NULL,
  contact_info TEXT NOT NULL,                       -- 脱敏: 支付宝账号/微信号/银行卡号

  -- 状态
  status withdrawal_status NOT NULL DEFAULT 'pending',

  -- 审批
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  process_note TEXT,

  -- 打款凭证
  payment_proof_url TEXT,

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX idx_withdrawals_blogger_id ON public.withdrawals(blogger_id, requested_at DESC);
CREATE INDEX idx_withdrawals_status ON public.withdrawals(status) WHERE status IN ('pending', 'approved');

CREATE TRIGGER trg_withdrawals_updated_at
  BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.withdrawals IS '博主提现申请. 关联多个 commission, 审批通过后将 commission 状态从 available → withdrawn';
COMMENT ON COLUMN public.withdrawals.commission_ids IS '本次提现包含的 commission UUID 列表. 审批通过时, 这些 commission 状态变为 withdrawn';
COMMENT ON COLUMN public.withdrawals.contact_info IS '脱敏后的打款账号. 例: 138****1234 (手机), 62****8888 (银行卡)';

-- =============================================================================
-- RLS 策略
-- =============================================================================
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- 博主可读自己的提现记录
CREATE POLICY "withdrawals_select_own" ON public.withdrawals
  FOR SELECT USING (
    blogger_id IN (SELECT id FROM public.bloggers WHERE user_id = auth.uid())
  );

-- =============================================================================
-- 辅助函数: 提现申请时检查余额
-- =============================================================================
CREATE OR REPLACE FUNCTION public.check_withdrawal_eligibility(
  p_blogger_id UUID,
  p_amount_cents BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available BIGINT;
  v_min_withdraw BIGINT := 1000;  -- 最小提现 ¥10
BEGIN
  SELECT available_cents INTO v_available
  FROM public.bloggers
  WHERE id = p_blogger_id
    AND status = 'approved';

  IF NOT FOUND THEN
    RETURN FALSE;  -- 博主不存在或非 approved 状态
  END IF;

  RETURN v_available >= p_amount_cents AND p_amount_cents >= v_min_withdraw;
END;
$$;

COMMENT ON FUNCTION public.check_withdrawal_eligibility IS '检查博主是否有足够余额提现. 最小提现 ¥10, 余额必须足够';

-- =============================================================================
-- End of 0008_create_withdrawals.sql
-- =============================================================================
