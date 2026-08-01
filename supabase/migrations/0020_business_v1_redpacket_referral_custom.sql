-- ============================================================================
-- aiwill-planner 业务 v1.0 落地 (2026-07-24 · 工作室已批准)
-- 覆盖:
--   1. 红包系统: 2-10 元随机 (200-1000 分), 订单使用上限 50%
--   2. 分享注册: 推荐人绑定 + 固定 ¥2 红包
--   3. 定制服务留言: custom_inquiries 表 + 邮件 330320991@qq.com
--   4. 反馈自动回复: feedback_auto_replies 关键词库
--   5. 代理博主: commission_rate 默认 3000 (30%), 提现门槛 5000 分 (¥50)
--   6. 用户表扩展: wechat_openid / wechat_unionid / referrer_id
-- ============================================================================

-- ============================================================================
-- 1. red_packets: 红包表 (单个 2-10 元随机, 30 天有效, 订单使用上限 50%)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.red_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 持有人
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- 红包金额 (200-1000 分, 即 ¥2-¥10, 硬约束)
  amount_cents INT NOT NULL CHECK (amount_cents >= 200 AND amount_cents <= 1000),

  -- 触发场景
  trigger TEXT NOT NULL CHECK (trigger IN (
    'order_paid',        -- 订单支付成功 (随机 2-10)
    'share_referral',    -- 分享注册成功 (固定 200 分 = ¥2)
    'feedback_adopted',  -- 反馈被采纳 (随机 2-10)
    'questionnaire_done',-- 问卷完成 (随机 2-10)
    'admin_grant'        -- 管理员手动发放
  )),

  -- 关联
  ref_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  ref_referral_id UUID,                       -- 指向 referrals.id (分享触发的红包)

  -- 状态机
  status TEXT NOT NULL DEFAULT 'issued'
    CHECK (status IN ('issued', 'used', 'expired', 'voided')),

  -- 使用情况 (本红包在订单里抵用了多少分)
  used_amount_cents INT NOT NULL DEFAULT 0 CHECK (used_amount_cents >= 0),
  used_in_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,

  -- 有效期 (issued 后 30 天)
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  expired_at TIMESTAMPTZ,                     -- 实际过期时间
  used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_red_packets_user_active
  ON public.red_packets(user_id, status, expires_at)
  WHERE status = 'issued';

COMMENT ON TABLE public.red_packets IS '用户红包 (2-10 元随机, 30 天有效, 订单使用上限 50%)';
COMMENT ON COLUMN public.red_packets.amount_cents IS '红包金额 200-1000 分 (¥2-¥10)';
COMMENT ON COLUMN public.red_packets.used_amount_cents IS '本红包在订单中已抵用的金额';

-- ============================================================================
-- 2. referrals: 推荐关系表 (分享注册 → A 立即得 ¥2)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  referrer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,  -- 分享人
  referee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,   -- 被邀请人 (新注册)

  -- 触发的红包
  red_packet_id UUID REFERENCES public.red_packets(id) ON DELETE SET NULL,

  -- 分享渠道 (wechat / link / qrcode / other)
  channel TEXT NOT NULL DEFAULT 'link'
    CHECK (channel IN ('wechat', 'link', 'qrcode', 'other')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 1 个 referee 只能被邀请 1 次
  CONSTRAINT uq_referrals_referee UNIQUE (referee_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer
  ON public.referrals(referrer_id, created_at DESC);

COMMENT ON TABLE public.referrals IS '分享注册关系, 1 个新用户只能被 1 个推荐人邀请';

-- ============================================================================
-- 3. custom_inquiries: 定制服务留言表 (→ 邮件 330320991@qq.com)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.custom_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 联系人
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 32),
  phone TEXT NOT NULL CHECK (length(phone) BETWEEN 8 AND 20),
  email TEXT,

  -- 需求
  doc_type TEXT,                                    -- 想要的文书类型
  description TEXT NOT NULL CHECK (length(description) BETWEEN 10 AND 2000),
  expected_budget TEXT,                             -- 期望预算 (开放回答, 不强制)
  expected_timeline TEXT,                           -- 期望时间

  -- 关联用户 (登录后可填)
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- 来源
  source TEXT NOT NULL DEFAULT 'website'
    CHECK (source IN ('website', 'wechat_mp', 'wechat_msg', 'other')),

  -- 状态
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'replied', 'in_progress', 'closed', 'rejected')),

  -- 内部备注
  admin_note TEXT,
  replied_at TIMESTAMPTZ,
  replied_by UUID REFERENCES public.users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_inquiries_status
  ON public.custom_inquiries(status, created_at DESC);

COMMENT ON TABLE public.custom_inquiries IS '定制服务留言, 自动邮件 → 330320991@qq.com';

-- ============================================================================
-- 4. feedback_auto_replies: 反馈关键词自动回复库
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.feedback_auto_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 触发关键词 (正则或简单包含, 大小写不敏感)
  keyword TEXT NOT NULL,
  match_type TEXT NOT NULL DEFAULT 'contains'
    CHECK (match_type IN ('contains', 'regex', 'exact')),

  -- 回复模板 (支持占位符: {user_name}, {order_count}, {refund_url})
  reply_template TEXT NOT NULL,

  -- 优先级 (数字越大越先匹配)
  priority INT NOT NULL DEFAULT 100,

  -- 状态
  enabled BOOLEAN NOT NULL DEFAULT TRUE,

  -- 统计
  hit_count INT NOT NULL DEFAULT 0,
  last_hit_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_auto_replies_priority
  ON public.feedback_auto_replies(priority DESC, enabled)
  WHERE enabled = TRUE;

COMMENT ON TABLE public.feedback_auto_replies IS '反馈关键词自动回复库 (15+ 高频场景)';

-- 种子: 15+ 高频关键词回复
INSERT INTO public.feedback_auto_replies (keyword, reply_template, priority) VALUES
  ('退款', '您的退款申请已收到, 我们将在 1-3 个工作日内审核。\n\n订单号: {order_id}\n订单金额: {order_amount}\n\n如有疑问请联系客服微信: 家有所爱', 200),
  ('怎么退款', '退款路径: 我的订单 → 选择订单 → 申请退款 → 填写理由。\n\n7 天内不满意全额退款, 无理由。\n\n操作链接: {refund_url}', 200),
  ('订单状态', '您的订单状态: {order_status}\n订单号: {order_id}\n支付时间: {paid_at}\n\n文书预计完成: {eta}\n\n更多详情: {order_url}', 150),
  ('进度', '您的文书正在处理中。当前进度: {progress}%。\n\n预计完成时间: {eta}\n\n实时查看: {order_url}', 150),
  ('发票', '电子发票将在订单完成后 3 个工作日内自动开具, 发至您注册邮箱。\n\n如需纸质发票请联系客服微信: 家有所爱', 100),
  ('怎么开发票', '路径: 我的订单 → 完成订单 → 申请发票 → 填写抬头税号。\n\n电子发票免费, 纸质发票 ¥10 工本费。', 100),
  ('客服', '客服微信: 家有所爱 (扫码添加)\n客服邮箱: 330320991@qq.com\n服务时间: 周一-周日 9:00-21:00', 100),
  ('微信', '客服微信: 家有所爱 (公众号同名)\n添加后可查询订单 + 申请退款 + 获取文书模板', 100),
  ('电话', '客服微信更便捷 (家有所爱)\n紧急联系电话仅 VIP 用户可见, 请添加客服微信获取', 100),
  ('价格', '本站所有文书统一 ¥19.9 (含 6 类: 婚前/婚内/离婚/抚养/赠与/传承)。\n\n定制服务请留言, 我们 24h 内回复。', 100),
  ('多少钱', '¥19.9 / 份。随机红包 2-10 元, 分享注册再得 ¥2。\n\n查看价格详情: https://h5.aiwill-planner.cn/pricing', 100),
  ('优惠券', '红包自动发放到您的账户 (¥2-¥10 随机), 订单结算时自动使用 (最高抵 50% 订单金额)。\n\n查看我的红包: {wallet_url}', 100),
  ('红包', '红包自动发放: 问卷完成 / 订单支付 / 分享注册 / 反馈采纳, 4 个场景。\n单个 ¥2-¥10 随机, 30 天有效。\n订单使用上限: 50% 订单金额。', 100),
  ('定制', '定制服务 (复杂资产 / 多份文书 / 企业级) 请留言: https://h5.aiwill-planner.cn/custom\n\n我们 24h 内邮件回复: 330320991@qq.com', 100),
  ('企业', '企业级家庭资产规划 / 批量文书 / 培训咨询请留言定制:\nhttps://h5.aiwill-planner.cn/custom\n\n或邮件 330320991@qq.com', 100),
  ('bug', '感谢您的反馈!技术团队会尽快查看。\n\n问题页: {page_url}\n提交时间: {created_at}\n\n紧急 bug 请加客服微信标注 [紧急]', 100),
  ('错误', '已记录, 工程师会查看。\n错误页面: {page_url}\n如反复出现请加客服微信', 100),
  ('打不开', '请尝试: 1) 刷新页面 2) 切换 4G/WiFi 3) 清除浏览器缓存\n\n仍不行请联系客服微信 (家有所爱), 我们远程协助。', 100),
  ('登录不上', '登录问题排查: 1) 确认邮箱/手机号 2) 检查密码大小写 3) 尝试微信一键登录 4) 申请短信验证码\n\n仍不行请联系客服', 100),
  ('收不到验证码', '验证码 5 分钟内有效。\n请检查: 1) 手机信号 2) 垃圾短信拦截 3) 是否被运营商屏蔽\n\n可改用微信一键登录', 100)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. users 表扩展: 微信 + 推荐人
-- ============================================================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS wechat_openid TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS wechat_unionid TEXT,
  ADD COLUMN IF NOT EXISTS referrer_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_wechat_openid
  ON public.users(wechat_openid) WHERE wechat_openid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_referrer
  ON public.users(referrer_id) WHERE referrer_id IS NOT NULL;

COMMENT ON COLUMN public.users.wechat_openid IS '微信公众号 openid (微信一键登录用)';
COMMENT ON COLUMN public.users.wechat_unionid IS '微信开放平台 unionid (跨公众号统一身份)';
COMMENT ON COLUMN public.users.referrer_id IS '推荐人 user_id (分享注册时绑定)';

-- ============================================================================
-- 6. bloggers 表: commission_rate 默认 1000 → 3000 (30%)
-- ============================================================================
ALTER TABLE public.bloggers
  ALTER COLUMN commission_rate SET DEFAULT 3000;

COMMENT ON COLUMN public.bloggers.commission_rate IS '佣金比例 (basis points). 3000 = 30%, 默认值 2026-07-24 由 1000 改为 3000';

-- 已存在但仍是 1000 的博主批量更新 (一次性历史迁移)
UPDATE public.bloggers
SET commission_rate = 3000
WHERE commission_rate = 1000;

-- ============================================================================
-- 7. withdrawals 表: 提现门槛 1000 → 5000 分 (¥50)
--    通过应用层 zod 校验 + 数据库 CHECK 双保险
-- ============================================================================
-- 检查现有 CHECK 约束名
DO $$
DECLARE
  cn TEXT;
BEGIN
  SELECT conname INTO cn FROM pg_constraint
  WHERE conrelid = 'public.withdrawals'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%amount_cents%';
  IF cn IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.withdrawals DROP CONSTRAINT %I', cn);
  END IF;
END $$;

ALTER TABLE public.withdrawals
  ADD CONSTRAINT withdrawals_amount_min_5000 CHECK (amount_cents >= 5000);

COMMENT ON CONSTRAINT withdrawals_amount_min_5000 ON public.withdrawals IS '提现门槛 ¥50 (2026-07-24 由 ¥10 改为 ¥50, 工作室批准)';

-- ============================================================================
-- 8. RPC: 红包发放 (随机 2-10 元)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.issue_red_packet(
  p_user_id UUID,
  p_trigger TEXT,
  p_ref_order_id UUID DEFAULT NULL,
  p_ref_referral_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_amount_cents INT;
  v_id UUID;
BEGIN
  -- 触发类型决定金额
  IF p_trigger = 'share_referral' THEN
    v_amount_cents := 200;  -- 固定 ¥2
  ELSIF p_trigger = 'admin_grant' THEN
    v_amount_cents := 500;  -- 管理员默认 ¥5 (允许覆盖)
  ELSE
    -- 随机 200-1000 分 (¥2-¥10), 含两端
    v_amount_cents := 200 + floor(random() * 801)::INT;
    -- 边界修正 (因 floor(random()*801) 可能为 800 → 1000 OK, 但 200 + 800 = 1000 ✓)
    v_amount_cents := LEAST(GREATEST(v_amount_cents, 200), 1000);
  END IF;

  INSERT INTO public.red_packets (user_id, amount_cents, trigger, ref_order_id, ref_referral_id)
  VALUES (p_user_id, v_amount_cents, p_trigger, p_ref_order_id, p_ref_referral_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.issue_red_packet IS '发放红包 (随机 2-10 元, 分享注册固定 2 元)';

-- ============================================================================
-- 9. RPC: 订单结算时校验红包使用 ≤ 50% 订单金额
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_red_packet_usage_cap(
  p_user_id UUID,
  p_use_amount_cents INT,
  p_order_amount_cents INT
)
RETURNS TABLE(ok BOOLEAN, max_allowed_cents INT, current_used_cents INT, available_cents INT)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_max_allowed INT;
  v_available INT;
  v_used INT;
BEGIN
  v_max_allowed := floor(p_order_amount_cents * 0.50)::INT;
  v_available := COALESCE((
    SELECT SUM(amount_cents - used_amount_cents)::INT
    FROM public.red_packets
    WHERE user_id = p_user_id
      AND status = 'issued'
      AND expires_at > NOW()
  ), 0);
  v_used := COALESCE((
    SELECT SUM(used_amount_cents)::INT
    FROM public.red_packets
    WHERE user_id = p_user_id
      AND used_in_order_id IS NOT NULL
  ), 0);

  RETURN QUERY SELECT
    (p_use_amount_cents <= v_max_allowed AND p_use_amount_cents <= v_available) AS ok,
    v_max_allowed AS max_allowed_cents,
    v_used AS current_used_cents,
    v_available AS available_cents;
END;
$$;

COMMENT ON FUNCTION public.check_red_packet_usage_cap IS '校验红包使用 ≤ 50% 订单金额 + 用户实际可用余额';

-- ============================================================================
-- 10. RPC: 绑定推荐关系 + 触发 ¥2 红包
-- ============================================================================
CREATE OR REPLACE FUNCTION public.bind_referral_and_reward(
  p_referee_id UUID,
  p_referrer_id UUID,
  p_channel TEXT DEFAULT 'link'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral_id UUID;
  v_red_packet_id UUID;
BEGIN
  -- 防自邀
  IF p_referee_id = p_referrer_id THEN
    RAISE EXCEPTION '不能邀请自己';
  END IF;

  -- 幂等: 1 个 referee 只绑一次
  BEGIN
    INSERT INTO public.referrals (referrer_id, referee_id, channel)
    VALUES (p_referrer_id, p_referee_id, p_channel)
    RETURNING id INTO v_referral_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO v_referral_id FROM public.referrals WHERE referee_id = p_referee_id;
    RETURN v_referral_id;  -- 已绑过, 直接返回
  END;

  -- 更新 users.referrer_id
  UPDATE public.users SET referrer_id = p_referrer_id WHERE id = p_referee_id;

  -- 给 referrer 发 ¥2 红包
  v_red_packet_id := public.issue_red_packet(
    p_user_id := p_referrer_id,
    p_trigger := 'share_referral',
    p_ref_referral_id := v_referral_id
  );

  -- 回写红包的 ref_referral_id
  UPDATE public.red_packets SET ref_referral_id = v_referral_id WHERE id = v_red_packet_id;

  RETURN v_referral_id;
END;
$$;

COMMENT ON FUNCTION public.bind_referral_and_reward IS '绑定推荐关系 + 给 referrer 发 ¥2 红包 (幂等)';

-- ============================================================================
-- 11. RPC: 自动反馈关键词匹配
-- ============================================================================
CREATE OR REPLACE FUNCTION public.match_feedback_keyword(p_text TEXT)
RETURNS TABLE(id UUID, reply_template TEXT)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT far.id, far.reply_template
  FROM public.feedback_auto_replies far
  WHERE far.enabled = TRUE
    AND (
      (far.match_type = 'contains' AND p_text ILIKE '%' || far.keyword || '%')
      OR (far.match_type = 'exact' AND p_text = far.keyword)
    )
  ORDER BY far.priority DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.match_feedback_keyword IS '从反馈文本匹配关键词, 返回最高优先级的回复模板';

-- ============================================================================
-- 12. 触发表: 订单 paid → 自动发 2-10 元红包
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_order_paid_issue_redpacket()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    PERFORM public.issue_red_packet(
      p_user_id := NEW.user_id,
      p_trigger := 'order_paid',
      p_ref_order_id := NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_paid_redpacket ON public.orders;
CREATE TRIGGER trg_orders_paid_redpacket
  AFTER UPDATE OF payment_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_order_paid_issue_redpacket();

COMMENT ON TRIGGER trg_orders_paid_redpacket ON public.orders IS '订单 paid → 自动发 2-10 元红包';

-- ============================================================================
-- 13. 触发表: 定制服务留言 → 自动邮件 (应用层调用, DB 只记录)
--    (邮件发送由 Next.js API /api/custom-inquiry 处理, DB 仅落库)
-- ============================================================================

-- ============================================================================
-- 完成
-- ============================================================================
COMMENT ON SCHEMA public IS 'aiwill-planner 业务 v1.0 (2026-07-24): 红包 2-10 元 / 分享 ¥2 / 定制留言 / 自动回复 / 30% 提成 / ¥50 提现 / 微信登录';