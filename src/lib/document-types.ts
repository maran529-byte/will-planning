/**
 * 共享文书类型定义 + 配色 + 标签
 *
 * 改版 v5 (2026-06-09, 全站体检):
 *   - 提取 src/app/page.tsx + src/app/doc-type/page.tsx + src/app/result/page.tsx
 *     三处重复的 DOCUMENT_TYPES / colorClasses / DOC_LABELS 到单点源
 *   - 统一 6 类文书: marriage / marital-property / divorce / child-custody / gift / will
 *   - 颜色色板: rose/amber/slate/blue/emerald/purple (与 Tailwind v4 默认调色板一致)
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
  {
    id: "marriage",
    name: "婚姻协议书",
    description: "明确婚后财产分配、权利义务",
    icon: "💑",
    color: "rose",
    available: true,
    price: 19.9,
  },
  {
    id: "marital-property",
    name: "婚内财产协议",
    description: "约定婚姻存续期间财产归属",
    icon: "🏠",
    color: "amber",
    available: true,
    price: 19.9,
  },
  {
    id: "divorce",
    name: "离婚协议",
    description: "子女抚养、财产分割协议",
    icon: "📄",
    color: "slate",
    available: true,
    price: 19.9,
  },
  {
    id: "child-custody",
    name: "子女抚养协议",
    description: "明确抚养费、探视权安排",
    icon: "👨‍👩‍👧",
    color: "blue",
    available: true,
    price: 19.9,
  },
  {
    id: "gift",
    name: "赠与协议",
    description: "房产、财产赠与公证文书",
    icon: "🎁",
    color: "emerald",
    available: true,
    price: 19.9,
  },
  {
    id: "will",
    name: "遗嘱",
    description: "遗产分配、继承人指定",
    icon: "⚖️",
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

/** docType → 中文标签 (result 页 / 草稿 / 订单展示用) */
export const DOC_LABELS: Record<DocumentTypeId, string> = {
  will: "遗嘱",
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
