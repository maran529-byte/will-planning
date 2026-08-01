/**
 * 共享文书类型定义 + 配色 + 标签
 *
 * 改版 v5 (2026-06-09, 全站体检):
 *   - 提取 src/app/page.tsx + src/app/doc-type/page.tsx + src/app/result/page.tsx
 *     三处重复的 DOCUMENT_TYPES / colorClasses / DOC_LABELS 到单点源
 *   - 统一 6 类文书: marriage / marital-property / divorce / child-custody / gift / will
 *   - 颜色色板: rose/amber/slate/blue/emerald/purple (与 Tailwind v4 默认调色板一致)
 *
 * 改版 v6 (2026-06-09, 营销定位重塑 — Phase C):
 *   业务核心从"遗嘱传承"调整为"婚姻财产与资产规划":
 *   - 6 类文书顺序调整: 把受众最广、需求最强的"婚姻/婚内/离婚/抚养"前置
 *   - 文书 6 (will) 名称中性化为"财富传承规划", 图标与配色降级处理
 *   - 描述文案突出"家庭资产清晰"而非"身后安排", 降低推广阻力
 *   - 价格策略: AI 版保留 ¥19.9, 强调"1 份外卖的钱, 换家庭 30 年安稳"
 *   - 后端 API 路由不变, 存量订单/支付链路不受影响
 *
 * 设计:
 *   - Server Component / Client Component 都可安全 import (无副作用)
 *   - 价格不写死在前端 (以前 ¥19.9, 现在统一读 src/lib/config PRICING)
 *     仅保留展示用 "起价" 提示
 *
 * 引用方:
 *   - src/app/page.tsx                          (落地页)
 *   - src/app/doc-type/page.tsx                 (类型选择器)
 *   - src/app/result/page.tsx                   (结果页 → 用 DOC_LABELS)
 *   - src/app/questionnaire/page.tsx            (问卷 → 用 docType 查 LABEL)
 *   - src/components/VisitorIdBanner.tsx        (可能的首页 banner)
 */

export type DocumentTypeId =
  | "marriage"
  | "marital-property"
  | "divorce"
  | "child-custody"
  | "gift"
  | "will";

export type DocumentColorKey =
  | "rose"
  | "amber"
  | "slate"
  | "blue"
  | "emerald"
  | "purple";

export interface DocumentType {
  /** URL/数据库使用的 ID */
  id: DocumentTypeId;
  /** 中文显示名 */
  name: string;
  /** 一句话简介 (卡片副标题) */
  description: string;
  /** Emoji 图标 */
  icon: string;
  /** 配色键 (查 COLOR_CLASSES) */
  color: DocumentColorKey;
  /** 问卷是否已上线 (true=可点, false=显示"开发中") */
  available: boolean;
  /** 展示用起价 (元), 仅用于落地页卡片副文案, 真实价格以服务端 PRICING 为准 */
  price: number;
}

export const DOCUMENT_TYPES: readonly DocumentType[] = [
  // 1. 婚姻协议书 — 主推 (受众最广: 婚前/再婚/财产清晰化)
  {
    id: "marriage",
    name: "婚姻协议书",
    description: "婚前/再婚财产清晰化, 婚后权利义务约定",
    icon: "💑",
    color: "rose",
    available: true,
    price: 19.9,
  },
  // 2. 婚内财产协议 — 主推 (已婚中产, 房产/股权归属)
  {
    id: "marital-property",
    name: "婚内财产协议",
    description: "约定房产/存款/股权归属, 感情稳固的定心丸",
    icon: "🏠",
    color: "amber",
    available: true,
    price: 19.9,
  },
  // 3. 离婚协议 — 高需求
  {
    id: "divorce",
    name: "离婚协议书",
    description: "财产分割、债务安排一站写清, 和平分手",
    icon: "📄",
    color: "slate",
    available: true,
    price: 19.9,
  },
  // 4. 子女抚养协议 — 高需求
  {
    id: "child-custody",
    name: "子女抚养协议",
    description: "抚养费、探视权、教育规划安排清楚",
    icon: "👨‍👩‍👧",
    color: "blue",
    available: true,
    price: 19.9,
  },
  // 5. 赠与协议 — 资产保护
  {
    id: "gift",
    name: "赠与协议",
    description: "房产/股权/大额资产定向赠与, 可公证",
    icon: "🎁",
    color: "emerald",
    available: true,
    price: 19.9,
  },
  // 6. 财富传承规划 — 改名中性化 (原"遗嘱"), 降级处理
  //   - 避免直接用"遗嘱", 降低推广阻力
  //   - 图标从 ⚖️ 改为 📜 (中性, 不带司法权杖暗示)
  //   - 配色保留紫色, 但描述更聚焦"传承规划" 而非"身后安排"
  {
    id: "will",
    name: "财富传承规划",
    description: "家庭资产有序传承, 提前安排更安心",
    icon: "📜",
    color: "purple",
    available: true,
    price: 19.9,
  },
] as const;

/** 颜色 → Tailwind 工具类映射 (card bg / border / text / icon) */
export const COLOR_CLASSES: Record<
  DocumentColorKey,
  { bg: string; border: string; text: string; hover: string; icon: string }
> = {
  rose: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    hover: "hover:border-rose-400 hover:bg-rose-100",
    icon: "bg-rose-100 text-rose-600",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    hover: "hover:border-amber-400 hover:bg-amber-100",
    icon: "bg-amber-100 text-amber-600",
  },
  slate: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-700",
    hover: "hover:border-slate-400 hover:bg-slate-100",
    icon: "bg-slate-100 text-slate-600",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    hover: "hover:border-blue-400 hover:bg-blue-100",
    icon: "bg-blue-100 text-blue-600",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    hover: "hover:border-emerald-400 hover:bg-emerald-100",
    icon: "bg-emerald-100 text-emerald-600",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    hover: "hover:border-purple-400 hover:bg-purple-100",
    icon: "bg-purple-100 text-purple-600",
  },
};

/** docType → 中文标签 (result 页 / 草稿 / 订单展示用)
 *
 * 改版 v6: will → "财富传承规划" (落地页与 result 页统一口径)
 *   - 后端数据库存的还是 "wills" 表, 旧订单展示"遗嘱"暂保留 (历史)
 *   - 新生成的文书展示"财富传承规划"
 */
export const DOC_LABELS: Record<DocumentTypeId, string> = {
  will: "财富传承规划",
  marriage: "婚姻协议书",
  "marital-property": "婚内财产协议",
  divorce: "离婚协议书",
  "child-custody": "子女抚养协议",
  gift: "赠与协议",
};

/** 兜底: 未知 docType 用 "法律文书" */
export const FALLBACK_DOC_LABEL = "法律文书";

/**
 * 安全查 label, 未知 id 返回 fallback
 * 避免 result 页 / 订单页展示 "undefined"
 */
export function getDocLabel(docType: string | null | undefined): string {
  if (!docType) return FALLBACK_DOC_LABEL;
  return DOC_LABELS[docType as DocumentTypeId] ?? FALLBACK_DOC_LABEL;
}

/** 查 DocumentType 元数据, 找不到返回 null */
export function getDocumentType(id: string | null | undefined): DocumentType | null {
  if (!id) return null;
  return DOCUMENT_TYPES.find((d) => d.id === id) ?? null;
}

// ============================================================================
// 签署指引 (Signing Guides) — result 页使用
// 依据民法典 §1134-1142 (遗嘱) + §1065 (婚内协议) + §1078 (离婚协议) + §660 (赠与)
// 显示在文书下载区上方, 防止用户直接打印签名导致形式要件瑕疵
// ============================================================================
export interface SigningGuideStep {
  /** 步骤序号 (1/2/3) */
  order: number;
  /** 步骤标题 */
  title: string;
  /** 步骤详情 (1-2 句话) */
  detail: string;
}

export interface SigningGuide {
  /** 适用的民法典条款 */
  lawRef: string;
  /** 关键提示 (红字告警, 如见证人强制) */
  alert?: string;
  /** 公证建议文案 */
  notarization: string;
  /** 签署步骤数组 */
  steps: SigningGuideStep[];
}

export const SIGNING_GUIDES: Record<DocumentTypeId, SigningGuide> = {
  will: {
    lawRef: "《民法典》§1134-1142 (遗嘱形式)",
    alert: "⚠️ 自书/代书/打印/录音录像遗嘱均须有 2 名见证人在场 (继承人不得作见证人)",
    notarization: "推荐公证遗嘱, 效力最高且不易被撤销。涉及大额资产强烈建议公证。",
    steps: [
      { order: 1, title: "选择遗嘱形式", detail: "自书 (亲笔全文+签名+日期) / 公证 (公证处办理) / 代书 (2 名见证人+代书人) / 打印 (2 名见证人+每页签名) / 录音录像 (2 名见证人口头+全程录像)" },
      { order: 2, title: "召集见证人", detail: "继承人、受遗赠人及利害关系人不得担任见证人 (《民法典》§1140)" },
      { order: 3, title: "当面签署 + 注明年月日", detail: "立遗嘱人签名 + 见证人逐页签名 + 注明立遗嘱日期" },
      { order: 4, title: "建议公证处保管", detail: "公证遗嘱由公证机构保管, 自书/代书遗嘱建议存放于可信第三方 (律师/银行保险箱)" },
    ],
  },
  marriage: {
    lawRef: "《民法典》§1049 (夫妻约定)",
    notarization: "大额资产 (房产/股权) 婚前协议强烈建议办理公证, 避免后续举证困难。",
    steps: [
      { order: 1, title: "双方共同阅看文本", detail: "确保双方对每一条款均无异议, 文书须为双方真实意思表示 (《民法典》§150-151)" },
      { order: 2, title: "双方亲笔签名 + 注明年月日", detail: "甲方签名 / 乙方签名 / 签订日期, 不得代签或盖章代替" },
      { order: 3, title: "(可选) 办理公证", detail: "涉及房产/股权等大额资产, 建议双方共同到公证处办理公证, 一式三份 (双方各一份, 公证处存档)" },
      { order: 4, title: "结婚登记时出示", detail: "部分民政局可配合办理财产约定备案, 避免日后争议" },
    ],
  },
  "marital-property": {
    lawRef: "《民法典》§1065 (婚内财产约定)",
    notarization: "婚内协议可随时签订, 涉及房产/股权变动的建议办理公证或不动产登记。",
    steps: [
      { order: 1, title: "双方共同确认条款", detail: "确保财产归属/债务承担等条款均无异议" },
      { order: 2, title: "双方亲笔签名 + 注明年月日", detail: "婚内协议仅调整财产关系, 不影响人身关系" },
      { order: 3, title: "(可选) 办理公证", detail: "涉及房产/股权/车辆等登记财产, 建议公证后办理不动产/股权变更登记" },
    ],
  },
  divorce: {
    lawRef: "《民法典》§1076-1078 (协议离婚)",
    alert: "⚠️ 离婚协议须双方亲自到民政局申请离婚登记, 30 日冷静期内任何一方可撤回",
    notarization: "离婚协议无需公证, 但建议双方各执一份 + 留存电子档。",
    steps: [
      { order: 1, title: "双方共同阅看离婚协议", detail: "财产分割/子女抚养/债务承担等条款须双方真实意思表示" },
      { order: 2, title: "双方亲笔签名 + 注明年月日", detail: "在民政局协议离婚时, 工作人员会要求现场签字" },
      { order: 3, title: "双方共同到民政局申请离婚登记", detail: "提交离婚协议 + 户口本 + 身份证 + 结婚证 + 2 张 2 寸单人照片" },
      { order: 4, title: "等待 30 日冷静期 + 领取离婚证", detail: "冷静期满后 30 日内双方共同到民政局申请发给离婚证, 未共同申请视为撤回" },
    ],
  },
  "child-custody": {
    lawRef: "《民法典》§1084-1086 (子女抚养)",
    notarization: "抚养协议可公证, 涉及探视权强制执行的法院更认可公证版本。",
    steps: [
      { order: 1, title: "双方确认抚养/探视/费用条款", detail: "建议明确每月抚养费金额 + 大额医疗教育分摊 + 探视时间地点" },
      { order: 2, title: "双方亲笔签名 + 注明年月日", detail: "父母双方签字, 涉及子女满 8 周岁的可考虑子女意见" },
      { order: 3, title: "(可选) 办理公证", detail: "涉及强制执行探视权的情形, 公证版本更便于法院执行" },
      { order: 4, title: "(必要时) 法院调解书", detail: "通过法院调解达成的协议具有强制执行力, 可直接申请法院强制执行" },
    ],
  },
  gift: {
    lawRef: "《民法典》§657-660 (赠与合同)",
    alert: "⚠️ 不动产赠与未办理过户登记的不发生物权效力 (《民法典》§209)",
    notarization: "不动产/股权/大额动产赠与必须办理公证 + 变更登记, 否则存在撤销风险。",
    steps: [
      { order: 1, title: "双方确认赠与标的与条件", detail: "明确赠与财产 / 是否附条件 (赡养/学业) / 是否保留撤销权" },
      { order: 2, title: "双方亲笔签名 + 注明年月日", detail: "赠与人 + 受赠人签名 + 签订日期" },
      { order: 3, title: "办理公证", detail: "不动产/股权/大额动产必须公证, 公证费一般为标的额的 0.3%-1%" },
      { order: 4, title: "办理过户登记", detail: "不动产到不动产登记中心 / 股权到市场监督管理局 / 车辆到车管所办理变更登记" },
    ],
  },
};

/** 安全查签署指引 */
export function getSigningGuide(docType: string | null | undefined): SigningGuide | null {
  if (!docType) return null;
  return SIGNING_GUIDES[docType as DocumentTypeId] ?? null;
}
