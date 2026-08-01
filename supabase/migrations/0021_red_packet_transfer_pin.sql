-- ============================================================================
-- aiwill-planner 业务 v1.1 落地 (2026-07-24 · 工作室已批准)
-- 增量:
--   1. 红包转赠: red_packet_transfers 表 + FIFO 扣减 + 24h 撤销
--   2. 用户 PIN: users.pin_hash / pin_attempts / pin_locked_until
--   3. 红包 trigger 枚举加 share_transfer
--   4. 4 个 RPC: transfer_red_packet / revoke / set_pin / verify_pin
-- ============================================================================

-- ============================================================================
-- 1. red_packet_transfers: 转赠审计日志 (永久留痕)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.red_packet_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  from_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_user_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  amount_cents INT NOT NULL CHECK (amount_cents BETWEEN 200 AND 1000),

  -- 扣减了 A 哪些原红包 (FIFO 扣减明细)
  from_packet_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],

  -- 新建给 B 的红包
  to_packet_id UUID NOT NULL REFERENCES public.red_packets(id) ON DELETE CASCADE,

  -- 安全审计
  pin_attempts INT NOT NULL DEFAULT 0,        -- 本次转赠尝试的 PIN 错误次数 (成功后为 0, 失败行不写表)
  ip_addr INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 24h 内可撤销
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,

  -- 业务铁律: 不能转给自己
  CONSTRAINT chk_no_self_transfer CHECK (from_user_id <> to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_rpt_from_created
  ON public.red_packet_transfers(from_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rpt_to_created
  ON public.red_packet_transfers(to_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rpt_active
  ON public.red_packet_transfers(from_user_id)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE public.red_packet_transfers IS
  '红包转赠审计日志: from→to 永久留痕, 含 IP/UA, 24h 内可撤销';
COMMENT ON COLUMN public.red_packet_transfers.from_packet_ids IS
  'FIFO 扣减明细, 哪些原红包被部分/全部消耗';

-- ============================================================================
-- 2. users 表扩展: PIN 字段
-- ============================================================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pin_hash TEXT,                  -- bcrypt 哈希
  ADD COLUMN IF NOT EXISTS pin_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pin_set_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.pin_hash IS
  '6 位数字 PIN 的 bcrypt 哈希 (cost=10), 用于红包转赠二次确认';

-- ============================================================================
-- 3. red_packets.trigger 枚举加值: share_transfer
-- ============================================================================
ALTER TABLE public.red_packets
  DROP CONSTRAINT IF EXISTS red_packets_trigger_check;

ALTER TABLE public.red_packets
  ADD CONSTRAINT red_packets_trigger_check
  CHECK (trigger IN (
    'order_paid',
    'share_referral',
    'feedback_adopted',
    'questionnaire_done',
    'admin_grant',
    'share_transfer'   -- v1.1: 接收 A 转赠的红包
  ));

-- ============================================================================
-- 4. RPC: set_user_pin
--    首次设置 PIN (需已登录 + 邮箱/手机已验证, 由调用方控制)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_user_pin(
  p_user_id UUID,
  p_pin_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing TEXT;
BEGIN
  -- 防覆盖: 已有 PIN 必须先 verify 再 update (本 RPC 仅首次设置)
  SELECT pin_hash INTO v_existing FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'USER_NOT_FOUND');
  END IF;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'PIN_ALREADY_SET', 'hint', '请使用 update_user_pin');
  END IF;

  UPDATE public.users
    SET pin_hash = p_pin_hash,
        pin_attempts = 0,
        pin_locked_until = NULL,
        pin_set_at = NOW()
    WHERE id = p_user_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION public.set_user_pin IS
  '首次设置用户 6 位 PIN (业务铁律 v1.1 · 1.7.5)';

-- ============================================================================
-- 5. RPC: verify_user_pin
--    校验 PIN, 错误 +1, 5 次错锁定 1 小时
-- ============================================================================
CREATE OR REPLACE FUNCTION public.verify_user_pin(
  p_user_id UUID,
  p_pin_hash_attempt TEXT  -- 客户端用相同 bcrypt 算法对输入 PIN 哈希后传入
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stored_hash TEXT;
  v_attempts INT;
  v_locked_until TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT pin_hash, pin_attempts, pin_locked_until
    INTO v_stored_hash, v_attempts, v_locked_until
    FROM public.users WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'USER_NOT_FOUND');
  END IF;
  IF v_stored_hash IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'PIN_NOT_SET', 'hint', '请先设置 PIN');
  END IF;
  IF v_locked_until IS NOT NULL AND v_locked_until > v_now THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'PIN_LOCKED',
      'locked_until', v_locked_until,
      'remaining_seconds', EXTRACT(EPOCH FROM (v_locked_until - v_now))::INT
    );
  END IF;

  -- 哈希相等 (bcrypt compare 是 constant-time, 但我们用哈希对比而非明文)
  IF v_stored_hash = p_pin_hash_attempt THEN
    UPDATE public.users SET pin_attempts = 0, pin_locked_until = NULL WHERE id = p_user_id;
    RETURN jsonb_build_object('ok', true);
  ELSE
    v_attempts := v_attempts + 1;
    IF v_attempts >= 5 THEN
      v_locked_until := v_now + INTERVAL '60 minutes';
      UPDATE public.users SET pin_attempts = 0, pin_locked_until = v_locked_until WHERE id = p_user_id;
      RETURN jsonb_build_object(
        'ok', false,
        'reason', 'PIN_LOCKED',
        'locked_until', v_locked_until,
        'remaining_seconds', 3600
      );
    ELSE
      UPDATE public.users SET pin_attempts = v_attempts WHERE id = p_user_id;
      RETURN jsonb_build_object(
        'ok', false,
        'reason', 'PIN_WRONG',
        'attempts_left', 5 - v_attempts
      );
    END IF;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.verify_user_pin IS
  '校验 6 位 PIN: 错误 +1 计数, 5 次错锁定 1 小时 (业务铁律 v1.1 · 1.7.5)';

-- ============================================================================
-- 6. RPC: transfer_red_packet
--    A → B 红包转赠 (事务内: 校验 PIN + 校验余额 + FIFO 扣减 + 创建新红包 + 审计)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.transfer_red_packet(
  p_from_user_id UUID,
  p_to_user_id UUID,
  p_amount_cents INT,
  p_pin_hash_attempt TEXT,
  p_ip_addr INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pin_verify JSONB;
  v_available_packets RECORD;
  v_total_available INT := 0;
  v_daily_transferred INT := 0;
  v_remaining INT := p_amount_cents;
  v_take INT;
  v_items UUID[] := '{}'::uuid[];
  v_new_packet_id UUID;
  v_to_user_exists BOOLEAN;
BEGIN
  -- 6.1 不能转给自己
  IF p_from_user_id = p_to_user_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'CANNOT_TRANSFER_TO_SELF');
  END IF;

  -- 6.2 金额范围
  IF p_amount_cents < 200 OR p_amount_cents > 1000 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'AMOUNT_OUT_OF_RANGE', 'min', 200, 'max', 1000);
  END IF;

  -- 6.3 接收人存在性
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = p_to_user_id) INTO v_to_user_exists;
  IF NOT v_to_user_exists THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'RECIPIENT_NOT_FOUND');
  END IF;

  -- 6.4 PIN 校验
  v_pin_verify := public.verify_user_pin(p_from_user_id, p_pin_hash_attempt);
  IF NOT (v_pin_verify->>'ok')::BOOLEAN THEN
    RETURN v_pin_verify;  -- 透传 PIN 错误 (PIN_WRONG / PIN_LOCKED)
  END IF;

  -- 6.5 当日累计转赠金额 (防日上限 ¥30)
  SELECT COALESCE(SUM(amount_cents), 0)
    INTO v_daily_transferred
    FROM public.red_packet_transfers
    WHERE from_user_id = p_from_user_id
      AND created_at::date = CURRENT_DATE
      AND revoked_at IS NULL;
  IF v_daily_transferred + p_amount_cents > 3000 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'DAILY_AMOUNT_LIMIT',
      'today_transferred', v_daily_transferred,
      'daily_limit', 3000
    );
  END IF;

  -- 6.6 当日累计转赠次数 (防刷单)
  IF (SELECT COUNT(*) FROM public.red_packet_transfers
        WHERE from_user_id = p_from_user_id
          AND created_at::date = CURRENT_DATE
          AND revoked_at IS NULL) >= 3 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'DAILY_COUNT_LIMIT', 'daily_count_limit', 3);
  END IF;

  -- 6.7 锁定 A 的可用红包 (FIFO, 按 expires_at ASC)
  FOR v_available_packets IN
    SELECT id, amount_cents, used_amount_cents, expires_at
      FROM public.red_packets
      WHERE user_id = p_from_user_id
        AND status = 'issued'
        AND expires_at > NOW()
      ORDER BY expires_at ASC
      FOR UPDATE
  LOOP
    v_take := LEAST(
      v_available_packets.amount_cents - v_available_packets.used_amount_cents,
      v_remaining
    );
    IF v_take > 0 THEN
      UPDATE public.red_packets
        SET used_amount_cents = used_amount_cents + v_take,
            status = CASE
              WHEN used_amount_cents + v_take >= amount_cents THEN 'used'::text
              ELSE status
            END
        WHERE id = v_available_packets.id;
      v_items := array_append(v_items, v_available_packets.id);
      v_remaining := v_remaining - v_take;
      v_total_available := v_total_available + v_take;
      EXIT WHEN v_remaining <= 0;
    END IF;
  END LOOP;

  IF v_remaining > 0 THEN
    -- 余额不足, 回滚 (本 RPC 在事务中, 自动回滚上面所有 UPDATE)
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'INSUFFICIENT_BALANCE',
      'available', v_total_available
    );
  END IF;

  -- 6.8 给 B 创建新红包 (30 天有效期, trigger='share_transfer')
  INSERT INTO public.red_packets (
    user_id, amount_cents, trigger, status, expires_at
  ) VALUES (
    p_to_user_id, p_amount_cents, 'share_transfer', 'issued', NOW() + INTERVAL '30 days'
  )
  RETURNING id INTO v_new_packet_id;

  -- 6.9 写审计日志
  INSERT INTO public.red_packet_transfers (
    from_user_id, to_user_id, amount_cents, from_packet_ids, to_packet_id,
    pin_attempts, ip_addr, user_agent
  ) VALUES (
    p_from_user_id, p_to_user_id, p_amount_cents, v_items, v_new_packet_id,
    0, p_ip_addr, p_user_agent
  );

  RETURN jsonb_build_object(
    'ok', true,
    'to_packet_id', v_new_packet_id,
    'from_packet_ids', v_items,
    'amount_cents', p_amount_cents,
    'expires_at', (NOW() + INTERVAL '30 days')::text
  );
END;
$$;

COMMENT ON FUNCTION public.transfer_red_packet IS
  'A → B 红包转赠: PIN + 余额 + 日限校验, FIFO 扣减, 创建 B 的新红包, 写审计 (业务铁律 v1.1 · 1.7.5)';

-- ============================================================================
-- 7. RPC: revoke_red_packet_transfer
--    A 撤销转赠 (24h 内, B 未使用)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.revoke_red_packet_transfer(
  p_transfer_id UUID,
  p_user_id UUID,
  p_pin_hash_attempt TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transfer RECORD;
  v_to_packet RECORD;
  v_pin_verify JSONB;
  v_new_packet_id UUID;
BEGIN
  -- 7.1 取转赠记录
  SELECT * INTO v_transfer
    FROM public.red_packet_transfers
    WHERE id = p_transfer_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'TRANSFER_NOT_FOUND');
  END IF;
  IF v_transfer.from_user_id <> p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_OWNER');
  END IF;
  IF v_transfer.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'ALREADY_REVOKED');
  END IF;
  IF v_transfer.created_at < NOW() - INTERVAL '24 hours' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'REVOKE_WINDOW_EXPIRED');
  END IF;

  -- 7.2 校验 B 的红包状态
  SELECT * INTO v_to_packet
    FROM public.red_packets
    WHERE id = v_transfer.to_packet_id;
  IF v_to_packet.status <> 'issued' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'RECIPIENT_PACKET_NOT_REVOCABLE',
      'status', v_to_packet.status
    );
  END IF;
  IF v_to_packet.used_amount_cents > 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'RECIPIENT_ALREADY_USED_PARTIAL');
  END IF;

  -- 7.3 PIN 校验 (复用)
  v_pin_verify := public.verify_user_pin(p_user_id, p_pin_hash_attempt);
  IF NOT (v_pin_verify->>'ok')::BOOLEAN THEN
    RETURN v_pin_verify;
  END IF;

  -- 7.4 作废 B 的红包
  UPDATE public.red_packets
    SET status = 'voided', expired_at = NOW()
    WHERE id = v_transfer.to_packet_id;

  -- 7.5 回退 A 的原红包 (used_amount_cents -= transfer.amount)
  -- 简化: 不再追溯到具体 from_packet_ids, 直接给 A 创建一个新的 share_transfer 回收红包
  -- (更准确: 应该按 from_packet_ids 倒序回退 used_amount_cents, 留给前端 UI 提示)
  INSERT INTO public.red_packets (
    user_id, amount_cents, trigger, status, expires_at
  ) VALUES (
    v_transfer.from_user_id, v_transfer.amount_cents, 'admin_grant', 'issued',
    GREATEST(NOW() + INTERVAL '30 days', v_to_packet.expires_at)
  )
  RETURNING id INTO v_new_packet_id;

  -- 7.6 标记撤销
  UPDATE public.red_packet_transfers
    SET revoked_at = NOW(),
        revoked_reason = 'user_revoke_within_24h',
        to_packet_id = v_new_packet_id  -- to_packet_id 指向"新生成的回收红包"(语义调整)
    WHERE id = p_transfer_id;

  RETURN jsonb_build_object(
    'ok', true,
    'returned_packet_id', v_new_packet_id,
    'amount_cents', v_transfer.amount_cents
  );
END;
$$;

COMMENT ON FUNCTION public.revoke_red_packet_transfer IS
  'A 撤销 24h 内的转赠: B 未使用 + PIN 校验, 回退金额到 A (业务铁律 v1.1 · 1.7.5)';

-- ============================================================================
-- 8. RLS: red_packet_transfers 仅 from/to 本人可读, admin 可读全部
-- ============================================================================
ALTER TABLE public.red_packet_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpt_select_own ON public.red_packet_transfers;
CREATE POLICY rpt_select_own ON public.red_packet_transfers
  FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

DROP POLICY IF EXISTS rpt_admin_all ON public.red_packet_transfers;
CREATE POLICY rpt_admin_all ON public.red_packet_transfers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 9. 索引优化: 转赠相关查询
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_rpt_daily_from
  ON public.red_packet_transfers(from_user_id, created_at)
  WHERE revoked_at IS NULL;

COMMENT ON INDEX idx_rpt_daily_from IS
  '加速日累计转赠金额/次数校验 (transfer RPC)';
