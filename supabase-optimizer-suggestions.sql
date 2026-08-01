-- Migration: 加 optimizer_suggestions 表 (4 个优化器产出)
CREATE TABLE IF NOT EXISTS optimizer_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,              -- site_optimizer / feedback_optimizer / health_optimizer / content_scheduler
  category TEXT,                     -- seo / conversion / content / product / tech / keyword
  priority TEXT,                     -- P0 / P1 / P2
  title TEXT NOT NULL,               -- 建议标题
  action TEXT,                       -- 具体行动 (JSON 字符串 or 文字)
  expected_impact TEXT,              -- 预期影响
  status TEXT DEFAULT 'pending',     -- pending / approved / rejected / done
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optimizer_suggestions_source ON optimizer_suggestions(source);
CREATE INDEX IF NOT EXISTS idx_optimizer_suggestions_status ON optimizer_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_optimizer_suggestions_created_at ON optimizer_suggestions(created_at DESC);

-- 启用 RLS (但 service_role key 绕过 RLS, 仅用于后台)
ALTER TABLE optimizer_suggestions ENABLE ROW LEVEL SECURITY;
