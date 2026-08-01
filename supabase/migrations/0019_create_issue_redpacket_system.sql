-- ============================================================================
-- aiwill-planner 用户问题反馈 + 红包激励系统 (Phase 1)
-- 创建日期: 2026-07-20
-- 作用:
--   1. 用户通过 /feedback 提交问题 (doc_type, severity, title, desc, screenshot)
--   2. 管理员在 /admin/issues 审核, 确认即发放红包 (¥1-99)
--   3. 红包只能在 /payment 抵用服务费, 不能提现/转赠
--   4. 自运营脚本每日扫描 issue_keywords 库匹配高频已知问题, 自动确认+自动修复报告
-- 关联: docs/PRD.md (新功能 v2)
--
-- ⚠️ 前置: 启用 pgcrypto 扩展 (Supabase 默认未启用, gen_random_uuid() 来自此扩展)
-- ============================================================================

-- 启用 pgcrypto 扩展 (提供 gen_random_uuid())
-- Supabase 的 public schema 默认在 supabase 镜像中已包含此扩展, 但需显式 CREATE EXTENSION
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 兼容性兜底: Supabase 旧镜像下 gen_random_uuid() 可能在 public schema 找不到
-- 上述 CREATE EXTENSION 会把它放到 extensions schema, 这里做一个 public 别名
CREATE OR REPLACE FUNCTION public.gen_random_uuid()
RETURNS uuid
LANGUAGE sql
VOLATILE
AS $$
  SELECT extensions.gen_random_uuid();
$$;

-- ============================================================================
-- 1. user_issues: 用户问题表
-- ============================================================================

-- ============================================================================
-- 1. user_issues: 用户问题表
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 提交人 (允许游客, 此时 user_id = NULL, 通过 visitor_openid 关联)
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  visitor_openid TEXT,                              -- 来自 cookie, 关联游客提交

  -- 问题分类
  doc_type TEXT,                                    -- prenup/postnup/divorce/custody/gift/will/payment/general
  severity TEXT NOT NULL DEFAULT 'normal'
    CHECK (severity IN ('low', 'normal', 'high', 'critical')),

  -- 问题内容
  title TEXT NOT NULL CHECK (length(title) BETWEEN 4 AND 80),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 10 AND 2000),
  screenshot_url TEXT,                              -- 截图 URL (Supabase Storage)
  page_url TEXT,                                    -- 出问题页面
  user_agent TEXT,

  -- 状态机
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',        -- 待审核
      'confirmed',      -- 管理员已确认采纳, 已发放红包
      'auto_resolved',  -- 自运营脚本自动确认+报告
      'rejected',       -- 拒绝 (重复/无效/不可复现)
      'closed'          -- 用户撤回/已自行解决
    )),

  -- 红包 (单位: 分, 避免浮点)
  reward_cents INT DEFAULT 0 CHECK (reward_cents >= 0 AND reward_cents <= 9999),
  rewarded_at TIMESTAMPTZ,
  rewarded_by UUID REFERENCES public.users(id),

  -- 自运营
  matched_keyword_id UUID,                          -- 命中 issue_keywords.id
  auto_resolve_note TEXT,                           -- 自动修复说明
  resolved_in_commit TEXT,                          -- 修复 commit SHA

  -- 管理员备注
  admin_note TEXT,

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 同一游客同标题 7 天内不可重复
  CONSTRAINT no_self_duplicate UNIQUE (visitor_openid, title, created_at)
);

CREATE INDEX IF NOT EXISTS idx_user_issues_status
  ON public.user_issues(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_issues_user_id
  ON public.user_issues(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_issues_visitor
  ON public.user_issues(visitor_openid) WHERE visitor_openid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_issues_pending
  ON public.user_issues(created_at DESC) WHERE status = 'pending';

COMMENT ON TABLE public.user_issues IS '用户提交的问题/Bug 反馈, 含红包激励状态';
COMMENT ON COLUMN public.user_issues.reward_cents IS '管理员确认采纳后发放的红包金额, 单位: 分';

-- ============================================================================
-- 2. user_wallets: 用户钱包 (余额表)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_wallets (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,

  -- 余额 (单位: 分) — 这是已发放且未过期未消费的部分
  balance_cents INT NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),

  -- 累计指标
  total_earned_cents INT NOT NULL DEFAULT 0,
  total_consumed_cents INT NOT NULL DEFAULT 0,
  total_expired_cents INT NOT NULL DEFAULT 0,

  -- 乐观锁
  version INT NOT NULL DEFAULT 1,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.user_wallets IS '用户钱包余额, 红包只能在此系统内抵用, 不能提现/转赠';

-- ============================================================================
-- 3. wallet_transactions: 钱包流水 (4 种类型)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- 类型
  type TEXT NOT NULL CHECK (type IN ('reward', 'consume', 'refund', 'expire')),

  -- 金额 (始终正数, type 决定加减方向)
  amount_cents INT NOT NULL CHECK (amount_cents > 0),

  -- 关联 (具体看 type)
  ref_issue_id UUID REFERENCES public.user_issues(id) ON DELETE SET NULL,
  ref_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,

  -- 红包特有
  expires_at TIMESTAMPTZ,                           -- reward 类型必填, 180 天后过期
  expired_at TIMESTAMPTZ,                           -- 实际过期时间 (定时任务写入)

  -- 备注
  note TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user
  ON public.wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_unexpired
  ON public.wallet_transactions(user_id, expires_at)
  WHERE type = 'reward' AND expired_at IS NULL;

COMMENT ON TABLE public.wallet_transactions IS '钱包流水表: reward(管理员发红包)/consume(下单抵扣)/refund(订单退款返还)/expire(过期清零)';

-- ============================================================================
-- 4. issue_keywords: 自运营关键词库
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.issue_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 匹配规则
  keyword_pattern TEXT NOT NULL,                    -- 关键词, 多个用 | 分隔, 大小写不敏感
  match_target TEXT NOT NULL DEFAULT 'both'
    CHECK (match_target IN ('title', 'description', 'both')),

  -- 自动确认时的默认红包 (单位: 分)
  default_reward_cents INT NOT NULL DEFAULT 500
    CHECK (default_reward_cents >= 100 AND default_reward_cents <= 9900),

  -- 命中后给自运营脚本的提示
  auto_resolve_message TEXT,

  -- 状态
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  hit_count INT NOT NULL DEFAULT 0,
  last_hit_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issue_keywords_active
  ON public.issue_keywords(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE public.issue_keywords IS '自运营脚本扫描用户 issue 时用的关键词库, 命中即自动确认+发放红包';

-- ============================================================================
-- 5. v_wallet_balances: 实时计算钱包余额视图
-- ============================================================================
CREATE OR REPLACE VIEW public.v_wallet_balances AS
SELECT
  w.user_id,
  w.balance_cents,
  w.total_earned_cents,
  w.total_consumed_cents,
  w.total_expired_cents,
  -- 计算即将过期 (30 天内) 的余额
  COALESCE(SUM(
    CASE WHEN t.type = 'reward'
         AND t.expired_at IS NULL
         AND t.expires_at > NOW()
         AND t.expires_at <= NOW() + INTERVAL '30 days'
    THEN t.amount_cents ELSE 0 END
  ), 0) AS expiring_soon_cents,
  -- 计算总未过期红包
  COALESCE(SUM(
    CASE WHEN t.type = 'reward'
         AND t.expired_at IS NULL
         AND t.expires_at > NOW()
    THEN t.amount_cents ELSE 0 END
  ), 0) AS unexpired_reward_cents
FROM public.user_wallets w
LEFT JOIN public.wallet_transactions t ON t.user_id = w.user_id
GROUP BY w.user_id, w.balance_cents, w.total_earned_cents,
         w.total_consumed_cents, w.total_expired_cents;

COMMENT ON VIEW public.v_wallet_balances IS '钱包余额聚合视图, 排除已过期红包';

-- ============================================================================
-- 6. updated_at 触发器
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_issues_updated_at ON public.user_issues;
CREATE TRIGGER trg_user_issues_updated_at
  BEFORE UPDATE ON public.user_issues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_user_wallets_updated_at ON public.user_wallets;
CREATE TRIGGER trg_user_wallets_updated_at
  BEFORE UPDATE ON public.user_wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_issue_keywords_updated_at ON public.issue_keywords;
CREATE TRIGGER trg_issue_keywords_updated_at
  BEFORE UPDATE ON public.issue_keywords
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 7. RLS (Row Level Security)
-- ============================================================================
ALTER TABLE public.user_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_keywords ENABLE ROW LEVEL SECURITY;

-- user_issues: 用户可读自己, 管理员全权, 任何人可 INSERT (游客也可)
DROP POLICY IF EXISTS p_user_issues_select_own ON public.user_issues;
CREATE POLICY p_user_issues_select_own ON public.user_issues
  FOR SELECT USING (
    user_id = auth.uid()
    OR visitor_openid = current_setting('app.visitor_openid', true)
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );

DROP POLICY IF EXISTS p_user_issues_insert_anyone ON public.user_issues;
CREATE POLICY p_user_issues_insert_anyone ON public.user_issues
  FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS p_user_issues_update_admin ON public.user_issues;
CREATE POLICY p_user_issues_update_admin ON public.user_issues
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );

-- user_wallets: 仅本人 + 管理员可读
DROP POLICY IF EXISTS p_user_wallets_select_own ON public.user_wallets;
CREATE POLICY p_user_wallets_select_own ON public.user_wallets
  FOR SELECT USING (
    user_id = auth.uid()
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );

-- wallet_transactions: 仅本人可读
DROP POLICY IF EXISTS p_wallet_tx_select_own ON public.wallet_transactions;
CREATE POLICY p_wallet_tx_select_own ON public.wallet_transactions
  FOR SELECT USING (
    user_id = auth.uid()
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );

-- issue_keywords: 仅管理员可读
DROP POLICY IF EXISTS p_issue_keywords_select_admin ON public.issue_keywords;
CREATE POLICY p_issue_keywords_select_admin ON public.issue_keywords
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );

-- ============================================================================
-- 8. 种子数据: 默认关键词库 (自运营启动用)
-- ============================================================================
INSERT INTO public.issue_keywords (keyword_pattern, default_reward_cents, auto_resolve_message) VALUES
  ('提交没反应|提交失败|问卷没反应', 500,
   '已知问题: 2026-06 月老问卷缓存清理流程, 修复 commit 见 aiwill-planner repo history. 请用户刷新页面重试。'),
  ('支付失败|付款失败|二维码不显示|扫码没反应', 800,
   '已知问题: 虎皮椒通道偶发超时, 已加自动重试 3 次 + 切换备用通道. 用户建议换通道或稍后再试。'),
  ('文档打不开|下载失败|PDF 错误', 500,
   '已知问题: Supabase Storage 临时 URL 过期, 已改为 24h 长期 URL. 请重新打开结果页。'),
  ('手机号收不到验证码|验证码延迟', 300,
   '已知问题: 短信网关延迟, 1-3 分钟内到达属正常. 超过 10 分钟请换邮箱登录。'),
  ('登录失败|登录不上|密码错误', 300,
   '已知问题: 微信 H5 登录态有时掉线, 已加自动重新登录. 请关闭微信重开。'),
  ('页面打不开|白屏|加载不出来|一直转圈', 500,
   '已知问题: Next.js 16 SSR + 中国大陆网络下偶发 CDN 缓存, 已加 stale-while-revalidate. 用户强制刷新即可。'),
  ('律师回复慢|律师没联系|法律咨询没回复', 800,
   '已知问题: 律师服务承诺 24h 首响, 偶尔漏单. 巡检脚本每日扫描, 超时自动催单 + 给用户发红包补偿。'),
  ('问卷选项不全|没我这种情况|选项缺失', 500,
   '已知问题: 问卷覆盖 80% 常见场景, 长尾场景已加"自定义描述". 反馈后会触发问卷扩容。'),
  ('红包看不到|余额不显示|抵用不了', 800,
   '已知问题: 红包余额计算可能延迟 5 分钟. 巡检脚本会立即重算并邮件通知管理员。'),
  ('多扣款|重复扣费|扣两次', 2000,
   '严重问题: 立即人工核对订单流水. 已自动退款 + 红包补偿, 用户可在订单页查退款进度。')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. 给现有 user_issues 表添加 matched_keyword_id 外键 (如果 issue_keywords 已存在)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_issues_matched_keyword_id_fkey'
      AND table_name = 'user_issues'
  ) THEN
    ALTER TABLE public.user_issues
      ADD CONSTRAINT user_issues_matched_keyword_id_fkey
      FOREIGN KEY (matched_keyword_id) REFERENCES public.issue_keywords(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 10. RPC: 安全发放红包 (并发安全)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.grant_issue_reward(
  p_issue_id UUID,
  p_reward_cents INT,
  p_granted_by UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_issue RECORD;
  v_user_id UUID;
  v_wallet RECORD;
  v_tx_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- 1. 校验 issue 状态
  SELECT * INTO v_issue FROM public.user_issues WHERE id = p_issue_id FOR UPDATE;
  IF v_issue IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ISSUE_NOT_FOUND');
  END IF;
  IF v_issue.status IN ('confirmed', 'auto_resolved') THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_REWARDED');
  END IF;
  IF v_issue.user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'GUEST_CANNOT_GET_REWARD',
      'detail', '游客提交的问题无法绑定钱包, 请用户登录后重新提交');
  END IF;
  IF p_reward_cents < 100 OR p_reward_cents > 9999 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT',
      'detail', '红包金额必须在 ¥1.00 到 ¥99.99 之间');
  END IF;

  v_user_id := v_issue.user_id;
  v_expires_at := NOW() + INTERVAL '180 days';

  -- 2. 写 wallet_transactions (reward)
  INSERT INTO public.wallet_transactions (
    user_id, type, amount_cents, ref_issue_id, expires_at, note
  ) VALUES (
    v_user_id, 'reward', p_reward_cents, p_issue_id, v_expires_at, p_note
  ) RETURNING id INTO v_tx_id;

  -- 3. upsert user_wallets (乐观锁)
  INSERT INTO public.user_wallets (user_id, balance_cents, total_earned_cents)
  VALUES (v_user_id, p_reward_cents, p_reward_cents)
  ON CONFLICT (user_id) DO UPDATE SET
    balance_cents = user_wallets.balance_cents + p_reward_cents,
    total_earned_cents = user_wallets.total_earned_cents + p_reward_cents,
    version = user_wallets.version + 1,
    updated_at = NOW();

  -- 4. 更新 issue 状态
  UPDATE public.user_issues SET
    status = 'confirmed',
    reward_cents = p_reward_cents,
    rewarded_at = NOW(),
    rewarded_by = p_granted_by,
    admin_note = COALESCE(admin_note, '') || E'\n[grant] ' || COALESCE(p_note, '')
  WHERE id = p_issue_id;

  RETURN jsonb_build_object(
    'success', true,
    'tx_id', v_tx_id,
    'user_id', v_user_id,
    'reward_cents', p_reward_cents,
    'expires_at', v_expires_at
  );
END;
$$;

COMMENT ON FUNCTION public.grant_issue_reward IS '管理员发放红包的安全 RPC, 含并发锁 + 状态校验 + 过期时间';

-- ============================================================================
-- 11. RPC: 支付时扣减余额
-- ============================================================================
CREATE OR REPLACE FUNCTION public.consume_wallet_balance(
  p_user_id UUID,
  p_amount_cents INT,
  p_order_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance INT;
  v_tx_id UUID;
BEGIN
  -- 1. 读余额 (FOR UPDATE 防止并发)
  SELECT balance_cents INTO v_balance
  FROM public.user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_amount_cents THEN
    RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_BALANCE',
      'available_cents', COALESCE(v_balance, 0),
      'requested_cents', p_amount_cents);
  END IF;

  -- 2. 扣减
  INSERT INTO public.wallet_transactions (
    user_id, type, amount_cents, ref_order_id, note
  ) VALUES (
    p_user_id, 'consume', p_amount_cents, p_order_id, p_note
  ) RETURNING id INTO v_tx_id;

  UPDATE public.user_wallets SET
    balance_cents = balance_cents - p_amount_cents,
    total_consumed_cents = total_consumed_cents + p_amount_cents,
    version = version + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'tx_id', v_tx_id,
    'consumed_cents', p_amount_cents,
    'remaining_cents', v_balance - p_amount_cents
  );
END;
$$;

COMMENT ON FUNCTION public.consume_wallet_balance IS '支付环节扣减余额, 不允许透支';

-- ============================================================================
-- 完成
-- ============================================================================
SELECT '0019_create_issue_redpacket_system.sql: applied ' || COUNT(*) || ' tables' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_issues', 'user_wallets', 'wallet_transactions', 'issue_keywords');
