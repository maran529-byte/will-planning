// form-data-filter.ts — 在调用 LLM 生成文书之前, 把"无效/占位"信息过滤掉
//
// 设计目标 (2026-06-09, 需求 #3 "自动过滤无效信息"):
//   1. 用户可能填了占位符 ("无", "N/A", "______", "-", 空白重复)
//   2. 用户可能忘了清空 (输入一半就提交)
//   3. 系统应静默丢弃占位符, 而不是把它们喂给 LLM
//   4. 真实填的 (无论多简短) 都要保留
//   5. 不修改原对象 (immutable update, 配合 React state)
//
// 调用方:
//   - /api/generate-will       → schema.validate() + sanitizeForLLM()
//   - /api/generate-document   → 同上
//   - 前端 "重新生成" 也可调用, 在客户端先 dry-run 一遍显示给用户
//
// 设计取舍:
//   - 宁严勿松: 把 N/A 当 null 丢掉, 比 "AI 在文书里写 N/A" 强
//   - 数字 0 / 空数组 / 字符串 "0" 都是有效值, 不丢
//   - checkbox 数组: 全是 "无效" 元素 → 丢整组; 否则保留有效元素

import type { z } from 'zod';

// ============================================================================
// 占位符词典 (中文 + 英文 + 符号)
// ============================================================================

const PLACEHOLDER_STRINGS = new Set<string>([
  // 中文
  '无', '无.', '无。', '没有', '不适用', '不需要', '暂不', '暂无', '暂不考虑', '尚未考虑', '尚未填写', '不填', '不填写', '空', '空白', '跳过', '略', '/', '//', '无内容', '无信息', '不记得', '不知道',
  // 英文
  'n/a', 'na', 'none', 'null', 'nil', 'no', 'n.a.', 'n.a', '-', '--', '---', '?', '??', '???', 'tbd', 'todo', 'pending', '/', '//', 'x', 'xx', 'xxx', '.', '..', '...', 'placeholder', 'example', 'test', 'sample', 'dummy', 'asdf', 'qwerty', 'aaa', 'bbb', 'ccc',
  // 中文填空
  '____', '_____', '______', '_______', '........', '..........', '？？？？',
]);

/**
 * 判断单条字符串是不是"占位符"
 * 规则: trim 后小写在词典里 / 只含下划线+空格 / 长度 < 2 且是符号
 */
function isPlaceholderString(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  const t = v.trim();
  if (t === '') return true;  // 空白算占位符
  if (PLACEHOLDER_STRINGS.has(t.toLowerCase())) return true;
  // 纯下划线/点号/破折号
  if (/^[._\-\s]+$/.test(t) && t.length <= 10) return true;
  // 全是相同字符 (如 "aaaaa", "？？？？？", "......")
  if (/^(.)\1{2,}$/u.test(t)) return true;
  // 中文重复填充 (如 "的的的的", "啊啊啊啊")
  return false;
}

/**
 * 判断单个 number 是不是"无效"
 * 规则: NaN / 负数 (除年龄等可能为 0) / 超过合理上限
 */
function isPlaceholderNumber(v: unknown): boolean {
  if (typeof v !== 'number') return false;
  if (Number.isNaN(v)) return true;
  // 0 通常是"未填" (但年龄=0 不太合理, 估值=0 不合理)
  // 不过我们没法区分, 所以保留 0, 由 schema 决定
  if (v < 0) return true;
  return false;
}

/**
 * 判断单个 array 是不是"无效"
 * 规则: 空数组 / 全是占位符
 */
function isPlaceholderArray(v: unknown): boolean {
  if (!Array.isArray(v)) return false;
  if (v.length === 0) return true;
  // checkbox: 过滤掉占位符元素
  return v.every(isPlaceholderString);
}

// ============================================================================
// 主函数
// ============================================================================

/**
 * 把 formData 里的"无效/占位"信息过滤掉
 *
 * 行为:
 *   - string = ''         → 删
 *   - string in 词典      → 删
 *   - string 全是下划线    → 删
 *   - number = NaN / < 0  → 删
 *   - array 空 / 全占位符  → 删
 *   - boolean false       → 保留 (业务语义)
 *   - object 递归处理
 *   - 其他类型 (Date, null, undefined) → 保留原样
 *
 * @returns 新的 (immutable) formData, 已剔除无效字段
 */
export function sanitizeFormData(
  formData: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let droppedCount = 0;

  for (const [key, value] of Object.entries(formData)) {
    if (isPlaceholderString(value)) {
      droppedCount++;
      continue;
    }
    if (isPlaceholderNumber(value)) {
      droppedCount++;
      continue;
    }
    if (isPlaceholderArray(value)) {
      droppedCount++;
      continue;
    }
    // 对象递归 (例如 specialArrangements / medicalWishes)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sanitized = sanitizeFormData(value as Record<string, unknown>);
      // 如果子对象清空了, 也算"无效"
      if (Object.keys(sanitized).length === 0) {
        droppedCount++;
        continue;
      }
      out[key] = sanitized;
      continue;
    }
    out[key] = value;
  }

  if (droppedCount > 0) {
    console.log(`[form-data-filter] dropped ${droppedCount} placeholder field(s)`);
  }
  return out;
}

/**
 * 统计被过滤的字段数 (用于前端展示 "已自动忽略 X 条无效信息")
 *
 * @returns { total: 输入字段数, dropped: 被过滤数, kept: 保留数 }
 */
export function countDroppedFields(
  formData: Record<string, unknown>
): { total: number; dropped: number; kept: number } {
  const total = Object.keys(formData).length;
  const sanitized = sanitizeFormData(formData);
  const kept = Object.keys(sanitized).length;
  return { total, dropped: total - kept, kept };
}

// ============================================================================
// zod 集成 helper
// ============================================================================

/**
 * 通用 "忽略空字符串" 预处理 (zod preprocess)
 *
 * 用法:
 *   z.preprocess(emptyToUndefined, z.string().optional())
 *   // "" → undefined, "张三" → "张三"
 *
 * 注意: 这只处理"空字符串 → undefined", 不处理 N/A 等占位符
 * 占位符由 sanitizeFormData() 负责
 */
export const emptyToUndefined = (v: unknown) => {
  if (typeof v === 'string' && v.trim() === '') return undefined;
  return v;
};

/**
 * 通用 "忽略占位符" 预处理 (zod preprocess)
 *
 * 用法:
 *   z.preprocess(stripPlaceholder, z.string().optional())
 *   // "N/A" / "无" / "____" → undefined
 *   // "张三" → "张三"
 */
export const stripPlaceholder = (v: unknown) => {
  if (isPlaceholderString(v)) return undefined;
  return v;
};

// ============================================================================
// 类型导出
// ============================================================================

/** 经过 sanitize 的 formData, 用于 LLM prompt */
export type SanitizedFormData = Record<string, unknown>;

/** 过滤统计 */
export type FilterStats = ReturnType<typeof countDroppedFields>;
