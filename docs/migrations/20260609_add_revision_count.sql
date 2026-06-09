-- Migration: 2026-06-09 add revision_count to all 6 doc tables
--
-- 目的: Batch B 需求 #4 - "在用户未下载文书前, 可以提供多次修改内容的权限"
--   - 后端代码 (src/app/api/revise/route.ts) 已实现
--   - API 在 insert/update 时尝试用 revision_count 列
--   - 如果表没有这列, 代码会自动降级 (不带 revision_count 重试, 已有逻辑)
--   - 但 UI 上 "剩余修改 N/3 次" 永远显示 3/3, 失去限制作用
--   - 运行本 migration 后, 修订次数限制才真正生效
--
-- 应用场景:
--   6 张表: wills, marriage, marital_property, divorce, child_custody, gift
--
-- 兼容性:
--   - 使用 IF NOT EXISTS (PG 9.6+)
--   - 不会锁表 (ALTER ADD COLUMN 在 PG 11+ 是轻量操作)
--   - 默认值 0, 不影响已有行
--
-- 执行方法 (任选其一):
--   1. Supabase SQL Editor (Dashboard → SQL Editor → New query → 粘贴本文件 → Run)
--   2. psql: psql -h <host> -U postgres -d postgres -f 20260609_add_revision_count.sql
--   3. supabase CLI: supabase db execute --file 20260609_add_revision_count.sql

-- ============================================================================
-- 主表: wills (Day 1 遗嘱)
-- ============================================================================
ALTER TABLE public.wills
  ADD COLUMN IF NOT EXISTS revision_count INT NOT NULL DEFAULT 0
  CHECK (revision_count >= 0 AND revision_count <= 10);

COMMENT ON COLUMN public.wills.revision_count IS
  '修订次数, 用户每次调 /api/revise + 1, 上限 3 次 (UI 层), DB 层 10 是安全兜底';

-- ============================================================================
-- Day 2 新增的 5 类非遗嘱文书
-- ============================================================================
-- 表名规则: docType 去掉连字符 (marital-property -> marital_property)
DO $$
DECLARE
  t TEXT;
  doc_tables TEXT[] := ARRAY['marriage', 'marital_property', 'divorce', 'child_custody', 'gift'];
BEGIN
  FOREACH t IN ARRAY doc_tables LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS revision_count INT NOT NULL DEFAULT 0 CHECK (revision_count >= 0 AND revision_count <= 10)',
      t
    );
    EXECUTE format(
      'COMMENT ON COLUMN public.%I.revision_count IS ''修订次数, 用户每次调 /api/revise + 1, 上限 3 次 (UI 层), DB 层 10 是安全兜底''',
      t
    );
  END LOOP;
END $$;

-- ============================================================================
-- 验证
-- ============================================================================
-- 运行完后, 可以在 Supabase SQL Editor 跑这一段来确认:
--
--   SELECT table_name, column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE column_name = 'revision_count'
--     AND table_schema = 'public'
--   ORDER BY table_name;
--
-- 应该返回 6 行 (wills + 5 个新表)

-- ============================================================================
-- 回滚 (如果需要)
-- ============================================================================
-- ALTER TABLE public.wills DROP COLUMN IF EXISTS revision_count;
-- ALTER TABLE public.marriage DROP COLUMN IF EXISTS revision_count;
-- ALTER TABLE public.marital_property DROP COLUMN IF EXISTS revision_count;
-- ALTER TABLE public.divorce DROP COLUMN IF EXISTS revision_count;
-- ALTER TABLE public.child_custody DROP COLUMN IF EXISTS revision_count;
-- ALTER TABLE public.gift DROP COLUMN IF EXISTS revision_count;
