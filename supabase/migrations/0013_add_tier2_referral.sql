-- =============================================================================
-- Migration 0013: 二级分销 (tier-2 referral) 支持
-- =============================================================================
-- 当博主 A 邀请博主 B 入驻, B 邀请的消费者 C 下单时:
--   - B 获得 tier-1 佣金 (按 B.commission_rate)
--   - A 获得 tier-2 佣金 (按 TIER2_COMMISSION_RATE, 默认为 3%)
--
-- 字段新增:
--   bloggers.parent_blogger_id
--     上级博主 (申请博主时通过 ?ref= 上级的 ref_code 注册)
--     NULL = 顶级博主 (无上级, 不可能获得 tier-2 佣金)
--
--   commissions.tier
--     1 = 直接推广 (B 推广了 C)
--     2 = 间推奖励 (A 通过 B 间接推广了 C)
--
--   commissions.referred_blogger_id
--     对 tier-2: 是触发该笔 tier-2 佣金的直接博主 B 的 id
--     对 tier-1: NULL (消费者不是博主, 没有 blogger 记录)
--     用于追踪 "这笔 tier-2 佣金是来自哪位下级"
--
-- 约束:
--   - tier-2 不可能由顶级博主 (parent_blogger_id IS NULL) 触发
--   - 每个 order_id + tier 组合最多 1 条 (tier-1 UNIQUE 已有, tier-2 需另加)
--   - 一笔订单最多 2 条 commission (1 tier-1 + 1 tier-2)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. bloggers.parent_blogger_id
-- -----------------------------------------------------------------------------
ALTER TABLE public.bloggers
  ADD COLUMN parent_blogger_id UUID
    REFERENCES public.bloggers(id) ON DELETE SET NULL;

CREATE INDEX idx_bloggers_parent_blogger_id
  ON public.bloggers(parent_blogger_id) WHERE parent_blogger_id IS NOT NULL;

COMMENT ON COLUMN public.bloggers.parent_blogger_id IS
  '上级博主. 申请博主时通过 ?ref= 父 ref_code 注册时填. NULL = 顶级博主.';

-- 防止自指 (博主不能是自己的上级)
ALTER TABLE public.bloggers
  ADD CONSTRAINT chk_bloggers_no_self_parent
  CHECK (parent_blogger_id IS NULL OR parent_blogger_id <> id);

-- 防止循环引用 (DB 层: 当 B.parent = A 时, A.parent 不能是 B 的子孙)
-- 完整循环检测需应用层处理 (新申请时校验), 简单约束防不住 A→B→A 三角循环
-- 但能防住 B.parent = B (自指)

-- -----------------------------------------------------------------------------
-- 2. commissions.tier + commissions.referred_blogger_id
-- -----------------------------------------------------------------------------
ALTER TABLE public.commissions
  ADD COLUMN tier SMALLINT NOT NULL DEFAULT 1
    CHECK (tier IN (1, 2));

ALTER TABLE public.commissions
  ADD COLUMN referred_blogger_id UUID
    REFERENCES public.bloggers(id) ON DELETE SET NULL;

-- tier-1 已有 UNIQUE(order_id); 改为 UNIQUE(order_id, tier) 以支持 tier-2
-- 原约束名: commissions_order_id_key (默认), 删除重建
ALTER TABLE public.commissions
  DROP CONSTRAINT IF EXISTS commissions_order_id_key;

ALTER TABLE public.commissions
  ADD CONSTRAINT uq_commissions_order_tier UNIQUE (order_id, tier);

-- tier-2 必填 referred_blogger_id; tier-1 不填
ALTER TABLE public.commissions
  ADD CONSTRAINT chk_commissions_tier_referred
  CHECK (
    (tier = 1 AND referred_blogger_id IS NULL) OR
    (tier = 2 AND referred_blogger_id IS NOT NULL)
  );

CREATE INDEX idx_commissions_tier ON public.commissions(tier) WHERE tier = 2;
CREATE INDEX idx_commissions_referred_blogger_id
  ON public.commissions(referred_blogger_id) WHERE referred_blogger_id IS NOT NULL;

COMMENT ON COLUMN public.commissions.tier IS
  '佣金层级: 1 = 直接推广, 2 = 间推奖励 (来自下级博主推广)';
COMMENT ON COLUMN public.commissions.referred_blogger_id IS
  '对 tier-2: 触发该笔 tier-2 佣金的直接博主 (即 B, A 的下级). 对 tier-1: NULL.';

-- -----------------------------------------------------------------------------
-- 3. 应用层配置: tier-2 佣金率
-- -----------------------------------------------------------------------------
-- 写入 application_config 表 (项目目前尚未使用, 暂时 hard-code 在 lib/affiliate.ts)
-- 这里先在注释中说明, 后续可由管理员在 admin 后台调整.
COMMENT ON TABLE public.commissions IS
  '佣金记录. 1 订单最多 2 条 (tier-1 + tier-2). 状态机 pending → available/voided → withdrawn. tier-2 默认佣金率 3% (300 basis points), 由 lib/affiliate.ts TIER2_RATE_BPS 控制.';

-- =============================================================================
-- End of 0013_add_tier2_referral.sql
-- =============================================================================
