-- ============================================================================
-- aiwill-planner 全球化 (W1) - Supabase 数据库迁移 v2
-- 创建日期: 2026-07-18
-- 基于: 0017_seed_cross_border_attachments.sql (2026-07-17)
-- 作用: 平台预审修正版 (v2)
--   - cb-003 (divorce): 修正海牙诱拐公约错误事实
--   - cb-004 (custody): 同上 + 移除"海牙中央机关协调"措辞
--   - cb-006 (will): 更新 2026 美国联邦遗产税免征额 13.61M → 13.99M USD
-- 执行位置: Supabase Dashboard -> SQL Editor -> New Query -> 粘贴本文件 -> Run
--
-- ⚠️ 本文件为平台预审修正版，仍需法律顾问李律师过审（见 律师审稿请求.md 第七节）
-- ============================================================================

-- ===== 1. users 表加 2 列 (与 v1 一致) =====
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS overseas_country VARCHAR(2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'zh-CN';

-- ===== 2. orders 表加 2 列 (与 v1 一致) =====
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS foreign_currency VARCHAR(3) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS foreign_amount NUMERIC(10, 2) DEFAULT NULL;

-- ===== 3. wills 表加 2 列 =====
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wills') THEN
    ALTER TABLE public.wills
      ADD COLUMN IF NOT EXISTS cross_border JSONB DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'zh-CN';
  END IF;
END $$;

-- ===== 4. 新表: 涉外附件模板 =====
CREATE TABLE IF NOT EXISTS public.cross_border_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type VARCHAR(20) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  law_reviewed_at DATE,
  law_reviewer TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doc_type, version)
);

ALTER TABLE public.cross_border_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_cross_border_attachments" ON public.cross_border_attachments;
CREATE POLICY "anon_read_cross_border_attachments"
  ON public.cross_border_attachments
  FOR SELECT
  USING (is_active = TRUE);

-- ===== 5. 新表: 合规勾选记录 =====
CREATE TABLE IF NOT EXISTS public.compliance_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL,
  consent_text TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  overseas_country VARCHAR(2),
  locale VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_consents_user
  ON public.compliance_consents(user_id, created_at DESC);

ALTER TABLE public.compliance_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_read_own_compliance_consents" ON public.compliance_consents;
CREATE POLICY "user_read_own_compliance_consents"
  ON public.compliance_consents
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- 6. 插入 6 类涉外附件种子数据 (v2 预审修正版)
-- ============================================================================

INSERT INTO public.cross_border_attachments (doc_type, version, content, law_reviewer, is_active)
VALUES
(
  'prenup',
  1,
  '## 涉外婚前财产协议附件

### 1. 适用法律
本协议依据《中华人民共和国民法典》第 1065 条、《最高人民法院关于适用〈中华人民共和国涉外民事关系法律适用法〉若干问题的解释(一)》起草。当事人可通过书面协议选择适用中华人民共和国法律 (准据法第 24 条)。

### 2. 国籍与居住国披露
双方应在协议首页如实披露:
- 现行国籍 (含多重国籍)
- 长期居住国 (每年居住超过 183 天)
- 是否持有境外永居身份 (绿卡/PR/入籍)

### 3. 境外财产特别约定
- 境外不动产: 双方确认不动产物权适用不动产所在地法
- 境外股权/股票: 按当地证券法执行披露义务
- 境外银行账户: 受当地银行保密法约束, 法院调取需经当地司法协助程序

### 4. 境外执行
本协议在中国境内签署/公证后, 如需在境外执行, 应经:
- 海牙公约缔约国 → Apostille 附加证明书 (中国 2023.11.7 加入)
- 非缔约国 → 中国驻外使领馆认证 + 所在国外交部认证

### 5. 双律师建议
**强烈建议** 双方在签署前委托中国大陆 + 境外居住国两地执业律师。

—— 家有所爱 · 全球华人法律文书平台

*本附件不构成任何境外法律意见, 仅供中国境内中国籍当事人参考。*',
  '李律师 (法律顾问) - 待过审 (v1 原文无改动)',
  TRUE
),
(
  'postnup',
  1,
  '## 涉外婚内财产协议附件

### 1. 适用法律
依据《民法典》第 1065 条, 婚内财产约定对双方具有法律约束力。涉外因素下, 准据法选择适用《法律适用法》第 24 条。

### 2. 跨境财产估值义务
双方对境外财产 (房产、股权、金融资产) 负有真实披露义务, 建议约定估值方法与重大变动报告义务 (单笔 > 50 万人民币等值)。

### 3. 外汇申报提示
跨境大额赠与/转账: 个人年度便利化额度等值 5 万美元, 超额需经外管局批准。

### 4. 变更与终止
婚内协议变更/终止应采用书面形式, 建议公证。

—— 家有所爱 · 全球华人法律文书平台

*本附件不构成任何境外法律意见, 仅供中国境内中国籍当事人参考。*',
  '李律师 (法律顾问) - 待过审 (v2 已补"不构成境外法律意见"声明)',
  TRUE
),
(
  'divorce',
  1,
  '## 涉外离婚协议附件

### 1. 管辖权
涉外离婚管辖:
- 中国大陆: 民政局 (协议离婚) 或 法院 (诉讼离婚)
- 驻外使领馆: 中国驻外使领馆可为中国公民办理协议离婚
- 境外: 按当地法律 (如美国各州、英国、新加坡)

### 2. 准据法
- 离婚: 适用受理法院地法 (《法律适用法》第 27 条)
- 财产分割: 协议选择适用, 未选择则适用夫妻共同经常居所地法
- 子女抚养: 有利于保护子女利益原则

### 3. 跨境子女抚养特殊条款 (2026-07-18 v2 修正)
- **重要事实说明**: 中国 **尚未** 加入 1980 年《国际诱拐儿童民事方面公约》(海牙儿童诱拐公约)。截至 2026 年, 全球共有 102 个缔约国, 但中国/印度/日本/韩国等人口大国均未加入。
- 跨境探视纠纷目前主要通过以下渠道处理:
  - 中国驻当地使领馆协助沟通
  - 当地家事法院 (Family Court) 直接申请
  - 双方协商签署《跨境探视协议》并经当地法院确认
- 跨境带离: 一方未经对方同意带离子女至境外, 可能构成非法带离 (按当地刑法 + 引渡条约处理)
- 抚养费跨境支付: 建议明确支付路径、外币币种、汇率基准日

### 4. 境外执行
本协议如需在境外执行, 应经外国法院判决在华承认程序 (互惠原则) 或海牙判决承认公约程序。

### 5. 双律师建议
双方应委托中国大陆 + 境外居住国两地执业律师。

—— 家有所爱 · 全球华人法律文书平台

*本附件不构成任何境外法律意见, 仅供中国境内中国籍当事人参考。*',
  '李律师 (法律顾问) - 待过审 (v2 已修正海牙儿童诱拐公约事实)',
  TRUE
),
(
  'custody',
  1,
  '## 涉外子女抚养协议附件

### 1. 适用法律
依据《民法典》第 1084 条、《法律适用法》第 25 条。

### 2. 海牙公约适用情况 (2026-07-18 v2 修正)
**重要事实说明**:
- 中国 **尚未** 加入 1980 年《国际诱拐儿童民事方面公约》(海牙儿童诱拐公约)。该公约目前共有 102 个缔约国, 中国/印度/日本/韩国未加入。
- 因此中国境内无法通过"海牙公约中央机关"渠道跨境协调返还/探视事宜。
- 实操中, 如发生跨境带离, 当事人应:
  - 立即向中国法院申请抚养权保护令
  - 通过中国驻当地使领馆提交领事协助申请
  - 委托当地 (境外) 律师向当地家事法院申请返还/探视裁定
- 跨境探视应通过双方协商 + 当地法院确认的协议执行, 建议明确探视频率、地点、费用、第三方监督机制

### 3. 跨境探视实操
- 探视频率、地点、费用、第三方监督建议
- 任一方擅自带离子女至境外的: 立即向中国法院申请抚养权保护令, 同时通过当地律师向境外家事法院申请返还

—— 家有所爱 · 全球华人法律文书平台

*本附件不构成任何境外法律意见, 仅供中国境内中国籍当事人参考。*',
  '李律师 (法律顾问) - 待过审 (v2 已修正海牙儿童诱拐公约事实)',
  TRUE
),
(
  'gift',
  1,
  '## 涉外赠与协议附件

### 1. 适用法律
依据《民法典》第 657-666 条、《法律适用法》第 36 条。

### 2. 跨境赠与外汇管理
- 个人年度便利化额度: 等值 5 万美元 (经常项目)
- 超额赠与: 需经外管局批准, 提交赠与公证 (建议律师审核资本项目与经常项目分类)
- 受赠人为外籍: 仍按中国境内赠与人主体管理

### 3. 受赠人境外税务告知
受赠人需自行了解所在国/地区税法 (美/英/加/澳/新各异)。美国赠与税 (Gift Tax) 2026 年终身免征额为 13.99M USD (按 IRS 通胀调整)。

### 4. 境外资产赠与
- 境外不动产赠与: 适用不动产所在地法
- 境外股权赠与: 当地证券法 + 公司章程限制
- 境外金融资产: 受当地银行 KYC 限制

—— 家有所爱 · 全球华人法律文书平台

*本附件不构成任何境外法律意见, 仅供中国境内中国籍当事人参考。*',
  '李律师 (法律顾问) - 待过审 (v2 已加"不构成境外法律意见"声明 + 补充 IRS 2026 赠与税免征额)',
  TRUE
),
(
  'will',
  1,
  '## 涉外遗嘱/继承规划附件

### 1. 适用法律
依据《民法典》继承编 (第 1133-1144 条)、《法律适用法》第 32-35 条。

### 2. 准据法选择
- 遗嘱方式: 符合立遗嘱人经常居所地法、国籍国法、遗嘱行为地法的均为有效
- 遗嘱实质: 适用立遗嘱人立遗嘱时或死亡时的经常居所地法或国籍国法
- 遗产管理: 动产适用被继承人死亡时经常居所地法, 不动产适用不动产所在地法

### 3. 境外资产继承流程
- 中国境内资产: 在中国法院办理继承公证
- 境外资产: 当地 Probate Court 程序, 需当地律师代理

### 4. 海牙遗嘱公约
中国尚未加入《海牙遗嘱处分形式公约》(1961), 故中国境内遗嘱在境外执行通常需重新办理公证认证手续。

### 5. 跨境认证流程 (海牙 Apostille)
- 中国境内文件送往海牙公约缔约国: 办理 Apostille (中国 2023.11.7 加入)
- 中国境内文件送往非缔约国: 中国外交部 + 目的国驻华使馆双认证

### 6. 税务告知 (2026-07-18 v2 修正)
- 中国境内遗产税: 暂未开征
- 美国: 联邦遗产税 (Estate Tax) **2026 年免征额 13.99M USD** (按 IRS 通胀调整, 单人; 夫妻联合 27.98M USD)
- 英国: 继承税 (Inheritance Tax) 325,000 GBP 免征额 + 继承人自住房产 175,000 GBP 额外免征 (Residence Nil-Rate Band)
- 加拿大/澳大利亚/新加坡: 无联邦遗产税 (但部分省份有 probate fee / 资本利得税需评估)

—— 家有所爱 · 全球华人法律文书平台

*本附件不构成任何境外法律意见, 仅供中国境内中国籍当事人参考。*',
  '李律师 (法律顾问) - 待过审 (v2 已更新 2026 美国联邦遗产税免征额 13.61M → 13.99M USD)',
  TRUE
)
ON CONFLICT (doc_type, version) DO NOTHING;

-- ============================================================================
-- v2 变更摘要 (vs v1):
--   cb-002 (postnup) - 末尾补"不构成境外法律意见"声明
--   cb-003 (divorce) - 修正海牙儿童诱拐公约错误, 改为"中国尚未加入"事实
--   cb-004 (custody) - 同上, 移除"海牙中央机关协调"措辞
--   cb-005 (gift)    - 末尾补"不构成境外法律意见"声明 + 加 IRS 2026 赠与税免征额
--   cb-006 (will)    - 2026 美国联邦遗产税免征额 13.61M → 13.99M USD
--   全部 6 类末尾统一补"不构成境外法律意见, 仅供中国境内中国籍当事人参考"
--
-- 待律师审稿后, 应生成 v3 (0018_update_law_reviewed_attachments.sql) 覆盖上述占位版。
-- ============================================================================

-- 执行完毕. 验证:
--   SELECT doc_type, version, law_reviewer FROM public.cross_border_attachments ORDER BY doc_type;
--   应返回 6 行, law_reviewer 字段含 "v2" 标记的为已修正行
-- ============================================================================