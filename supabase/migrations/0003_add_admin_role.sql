-- =============================================================================
-- Migration 0003: 给 users 表加 role 字段 (Phase 3 管理员后台)
--
-- 背景:
--   0001_init.sql 创建的 public.users 表只有 openid/phone/email/display_name
--   等基础字段, 没有角色区分. Phase 3 需要支持 admin/lawyer/blogger 等
--   多角色, 用于管理员后台 + 博主系统的权限分级.
--
-- 设计:
--   - role TEXT NOT NULL DEFAULT 'user' (而不是 enum) — 灵活性优先
--     未来加新角色 (如 'superadmin', 'auditor') 不用 ALTER TYPE
--   - 4 个值: 'user' (默认) | 'lawyer' (P1) | 'blogger' (Phase 4) | 'admin'
--   - CHECK 约束: 4 个值 + 未来加角色需先 ALTER CHECK
--   - 索引: 按 role 过滤是热路径 (admin 后台查 admin users, 博主查 blogger)
-- =============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- 收紧 CHECK: 4 个允许值
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
END
$$;

CREATE INDEX IF NOT EXISTS idx_users_role
  ON public.users(role)
  WHERE role != 'user';

COMMENT ON COLUMN public.users.role IS
  '用户角色: user (默认) | lawyer (P1) | blogger (Phase 4) | admin (Phase 3). 修改需先检查 RLS.';

-- =============================================================================
-- 配套: 让 admin 可以 SELECT 所有用户 (Phase 3 后台列表)
-- 现有 RLS 策略: users_select_own = auth.uid() = id (只能看自己)
-- 解决: service_role bypass RLS, 后台 API 用 admin 客户端
--       普通 anon/authenticated 仍只能看自己
-- 不需要额外策略 — service_role 默认全权
-- =============================================================================

-- End of 0003_add_admin_role.sql
