-- =============================================================================
-- Migration 0024: PC 端扫码登录 - 并发安全硬化 (改版 v15, 2026-08-02)
-- =============================================================================
-- 背景: 当多用户同时关注公众号输入【PC】, 或同一用户疯狂重复输入,
--       现有 SELECT + UPDATE 两步操作存在以下竞态:
--
--   竞态 A (孤儿 ticket 抢单竞争):
--     T1 worker 看到无主 ticket T_orphan
--     T2 worker 也看到无主 ticket T_orphan (同一行)
--     T1 抢到, UPDATE 写入 code=A, openid=A
--     T2 后抢到, UPDATE 覆盖 code=B, openid=B
--     A 用户收到的推送 "code=A" 与 DB 里实际值 "code=B" 不一致 ❌
--
--   竞态 B (同一 openid 多 ticket):
--     openid A 连续 3 次输入 pc, 3 个 worker 同时执行:
--     各自 SELECT 看不到对方的 pending ticket (都还没 commit)
--     各自 INSERT 创建 3 个 ticket
--     用户收到 3 个不同 code, 不知道用哪个 ❌
--
--   竞态 C (code 碰撞):
--     虽然 32^8 ≈ 1.1 万亿, 但理论上可能碰撞
--     当前 INSERT 没唯一约束, 会创建两个相同 code 的 ticket
--     PC 端输入 code 会随机命中其中之一 ❌
--
-- 修复:
--   1. 增加 UNIQUE INDEX on (code) WHERE status IN ('pending','confirmed')
--      → INSERT 阶段防 code 碰撞
--   2. 增加 atomic UPDATE WHERE status='pending' AND openid IS NULL
--      → 抢单阶段用条件 UPDATE 做原子 CAS (compare-and-swap)
--   3. 增加 (openid, status) 复合索引 + cancel-all-active 操作
--      → 同 openid 多 ticket 时统一 cancel, 只留 1 个 active
-- =============================================================================

-- 1. UNIQUE INDEX on code (仅对 active ticket 生效, 过期/已用 ticket 不约束)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pc_login_active_code
  ON public.pc_login_tickets(code)
  WHERE status IN ('pending', 'confirmed');

-- 2. 优化 (openid, status) 复合索引 — 当前 idx 已有, 但只到 (openid, status)
--    增补 (openid) WHERE status IN ('pending','confirmed') 让 cancel 更高效
CREATE INDEX IF NOT EXISTS idx_pc_login_openid_active
  ON public.pc_login_tickets(openid)
  WHERE status IN ('pending', 'confirmed') AND openid IS NOT NULL;

-- 3. 优化 (status, created_at) 复合索引 — 用于抢单时 SELECT FOR UPDATE SKIP LOCKED
--    当前 idx_pc_login_tickets_status_expires 是 (status, expires_at),
--    增补 (status, created_at DESC) 给孤儿 ticket 抢单用
CREATE INDEX IF NOT EXISTS idx_pc_login_status_created
  ON public.pc_login_tickets(created_at DESC)
  WHERE status = 'pending' AND openid IS NULL;

-- 4. 加注释说明并发控制策略
COMMENT ON INDEX uniq_pc_login_active_code IS
  '保证同一时刻不会有 2 个 active ticket 有相同 code — INSERT 阶段防碰撞';
COMMENT ON INDEX idx_pc_login_openid_active IS
  '加速 cancel-all-other-tickets 操作, 给同 openid 抢单流程用';
COMMENT ON INDEX idx_pc_login_status_created IS
  '加速孤儿 ticket 抢单的 SELECT FOR UPDATE SKIP LOCKED';