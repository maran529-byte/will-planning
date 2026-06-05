-- =============================================================================
-- Migration 0002: 给 orders 表加 openid 列
--
-- 背景:
--   0001_init.sql 创建的 orders 表用 user_id (UUID) 关联 public.users.id,
--   适合有完整 Supabase GoTrue auth 的环境.
--   但当前 dev / 早期生产部署用的是简化版 orders 表 (无 user_id 关联),
--   需直接存 openid 来做用户隔离.
--
-- 修复内容 (P0):
--   - 修复前: GET /api/create-order 无 openid 过滤, 返回所有用户订单
--   - 修复后: orders 表加 openid TEXT 列 + 索引, API 按 openid 过滤
--
-- 向后兼容:
--   - openid 列允许 NULL (旧数据保留)
--   - 新插入的订单必须传 openid (代码层强校验, 401 if missing)
-- =============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS openid TEXT;

-- 索引: 按 openid 查订单是热路径
CREATE INDEX IF NOT EXISTS idx_orders_openid
  ON public.orders(openid)
  WHERE openid IS NOT NULL;

-- 复合索引: 兼容旧查询 (created_at DESC 排序) + 新过滤
CREATE INDEX IF NOT EXISTS idx_orders_openid_created_at
  ON public.orders(openid, created_at DESC)
  WHERE openid IS NOT NULL;

COMMENT ON COLUMN public.orders.openid IS
  '所属用户的微信 OpenID. 由服务端从 HTTP-only cookie 读取, 客户端永不可信. NULL = 历史数据 (待清理).';

-- =============================================================================
-- 数据迁移: 尝试从 public.users 反查 user_id 填到 openid
--   注: 0001_init.sql 用 user_id 关联, 0002 引入 openid 后可以双写.
--   这次迁移只填存量数据, 未来 INSERT 路径用应用层 openid 直接写入.
-- =============================================================================

-- 如果旧表有 user_id, JOIN public.users 填 openid
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'user_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'openid'
  ) THEN
    UPDATE public.orders o
    SET openid = u.openid
    FROM public.users u
    WHERE o.user_id = u.id
      AND o.openid IS NULL
      AND u.openid IS NOT NULL;

    RAISE NOTICE 'Backfilled orders.openid from users.openid for rows with user_id';
  ELSE
    RAISE NOTICE 'Skipping backfill: user_id or users.openid column missing';
  END IF;
END
$$;

-- =============================================================================
-- End of 0002_add_orders_openid.sql
-- =============================================================================
