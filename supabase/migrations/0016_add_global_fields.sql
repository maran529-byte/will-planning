-- ============================================================================
-- Migration 0016 (2026-07-16): aiwill-planner 全球化字段
--   - 用户: 加 overseas_country (海外居住国) + locale (zh-CN / en-US)
--   - 订单: 加 foreign_currency + foreign_amount (USD 展示)
--   - 问卷/草稿: 加 cross_border (JSONB, 涉外因素) + locale
--   - 新表 contracts_cross_border_attachment_templates (涉外附件模板缓存)
-- ============================================================================
-- 安全: 所有 ALTER TABLE 都是 ADD COLUMN IF NOT EXISTS, 可重复执行
-- ============================================================================

-- 1. users 表加 2 列
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS overseas_country VARCHAR(2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'zh-CN';

COMMENT ON COLUMN public.users.overseas_country IS '海外居住国 ISO-3166 alpha-2 (US/GB/SG/CA/AU/HK), NULL = 国内';
COMMENT ON COLUMN public.users.locale IS '界面语言 (zh-CN 简体中文 / en-US 英文)';

-- 2. orders 表加 2 列 (海外展示用 USD/GBP/SGD)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS foreign_currency VARCHAR(3) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS foreign_amount NUMERIC(10, 2) DEFAULT NULL;

COMMENT ON COLUMN public.orders.foreign_currency IS '展示外币 (USD/GBP/SGD), NULL=未启用外币展示';
COMMENT ON COLUMN public.orders.foreign_amount IS '外币金额, 仅展示, 实际收款仍为 CNY';

-- 3. wills 表加 2 列 (跨境外因素)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wills') THEN
    ALTER TABLE public.wills
      ADD COLUMN IF NOT EXISTS cross_border JSONB DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'zh-CN';
  END IF;
END $$;

COMMENT ON COLUMN public.wills.cross_border IS '涉外因素: {hasForeignAsset, hasForeignParty, hasForeignResidency, foreignJurisdictions[], applicableLawHint}';
COMMENT ON COLUMN public.wills.locale IS '文书语言 (zh-CN 默认)';

-- 4. 新表: 涉外附件模板 (律师审核后固定内容, 启动时一次性导入)
CREATE TABLE IF NOT EXISTS public.cross_border_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type VARCHAR(20) NOT NULL,           -- prenup / postnup / divorce / custody / gift / will
  version INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,                    -- 涉外附件 Markdown 全文
  law_reviewed_at DATE,                     -- 法律顾问审核日期
  law_reviewer TEXT,                        -- 审核人姓名
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doc_type, version)
);

COMMENT ON TABLE public.cross_border_attachments IS '涉外法律附件模板 (律师审核, 不可编辑直接渲染)';

-- RLS: 公开读 (匿名用户可访问模板预览), 仅 service_role 写
ALTER TABLE public.cross_border_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_cross_border_attachments" ON public.cross_border_attachments;
CREATE POLICY "anon_read_cross_border_attachments"
  ON public.cross_border_attachments
  FOR SELECT
  USING (is_active = TRUE);

-- 5. 新表: 强制合规勾选记录 (用户下单前必须勾选 "我是中国公民/海外华人")
CREATE TABLE IF NOT EXISTS public.compliance_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL,        -- 'cross_border_user_identity' / 'legal_disclaimer' / 'pipl_overseas'
  consent_text TEXT NOT NULL,              -- 勾选当时的文案快照 (用于法律证据)
  ip_address INET,
  user_agent TEXT,
  overseas_country VARCHAR(2),              -- 勾选时填的居住国
  locale VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_consents_user
  ON public.compliance_consents(user_id, created_at DESC);

COMMENT ON TABLE public.compliance_consents IS '合规勾选记录 (法务留痕, 不可删除)';

ALTER TABLE public.compliance_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_read_own_compliance_consents" ON public.compliance_consents;
CREATE POLICY "user_read_own_compliance_consents"
  ON public.compliance_consents
  FOR SELECT
  USING (auth.uid() = user_id);