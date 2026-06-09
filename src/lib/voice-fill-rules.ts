// voice-fill-rules.ts — 把一段语音识别文本, 按规则自动分配到本页字段
//
// 设计目标 (2026-06-09, 4 项需求 #2):
//   1. 一段连续语音 → 拆分到多个字段 (姓名+电话+身份证等)
//   2. 纯前端, 无 LLM 成本, 离线可用, 毫秒级响应
//   3. 规则不匹配时, 不静默丢弃 → 提示用户 "请换种说法"
//
// 拆分策略 (按 priority 顺序, 命中后从 transcript 中扣掉已抽取片段):
//   P0 - 身份证号: 18 位 (末位 X) / 15 位纯数字
//   P0 - 手机号: 11 位 1[3-9]xxxxxxxxx
//   P1 - 姓名: 2-4 字中文, 紧跟"叫/是/姓/名"等关键词; 或 "我叫 X"/"甲方 X" 模式
//   P1 - 年龄: 数字 + 岁/岁数/年龄 关键词, 范围 0-150
//   P1 - 金额: 数字 + 元/万/块/块钱; 提取纯数字
//   P1 - 日期: 2026-08-15 / 2026年8月15日 / 8月15日
//   P2 - 婚姻/关系 radio: 关键词映射
//   P2 - 是/否 radio: 关键词映射
//   P3 - 数字字段 (年龄/年限/人数/金额): 提取最后一个孤立数字
//   P9 - 剩余文本 → 第一个空的 textarea 字段

import type { Question, Module } from './questionnaire';

// ============================================================================
// 类型
// ============================================================================

export interface FillResult {
  /** 给哪个字段赋值 */
  fieldKey: string;
  /** 字段值 (string | number | string[] 取决于 field type) */
  value: string | number | string[];
  /** 命中的规则名 (用于调试/提示) */
  rule: string;
  /** 人类可读的提取描述 (例: "手机号 138xxxx") */
  display: string;
}

export interface FillReport {
  /** 成功填入的字段 */
  filled: FillResult[];
  /** 没能匹配的文本片段 (用于提示) */
  unmatched: string[];
  /** 总识别字符数 (用于 UI 展示) */
  totalChars: number;
}

// ============================================================================
// 正则定义
// ============================================================================

// 18 位身份证 (末位 X 也算) 或 15 位老版
const ID_CARD_18 = /\b\d{17}[\dXx]\b/;
const ID_CARD_15 = /\b\d{15}\b/;

// 11 位手机号 (中国 1[3-9]xxx...)
const PHONE = /\b1[3-9]\d{9}\b/;

// 2-4 字中文姓名 (排除"先生/女士/小姐"等称谓, 因为这些常是称呼不是答案)
const CHINESE_NAME_2_4 = /[\u4e00-\u9fa5]{2,4}/;

// 数字 (1-4 位, 配合语境防误识别)
const NUMBER = /\d{1,4}/;

// 金额: 数字 + 元/万/块/块钱
const MONEY = /(\d+(?:\.\d+)?)\s*(?:元|块|块钱|万)/;

// 日期: 2026-08-15 / 2026年8月15日 / 2026/8/15 / 8月15日
const DATE_FULL = /(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?/;
const DATE_SHORT = /(\d{1,2})月(\d{1,2})日?/;

// ============================================================================
// 关键词词典
// ============================================================================

const MARRIAGE_KEYWORDS: Record<string, string> = {
  '未婚': '未婚', '没结婚': '未婚', '没结过婚': '未婚', '单身': '未婚',
  '已婚': '已婚', '结婚': '已婚', '已结婚': '已婚',
  '离异': '离异', '离婚': '离异', '已离婚': '离异',
  '丧偶': '丧偶', '丧偶了': '丧偶', '伴侣去世': '丧偶',
};

const YES_NO_KEYWORDS: Record<string, string> = {
  '是': '是', '有': '是', '是的': '是', '有的': '是', '对': '是',
  '不是': '否', '没有': '否', '无': '否', '没': '否', '否': '否',
};

const HAS_CHILDREN_KEYWORDS: Record<string, string> = {
  '是': '是', '有': '是', '是的': '是', '有的': '是',
  '否': '否', '没有': '否', '无': '否', '没': '否', '不要': '否',
};

// ============================================================================
// 工具函数
// ============================================================================

function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'number') return false;
  return false;
}

/**
 * 把"我叫张三 13800001234 510101199001011234"中的"张三"提取出来
 * 模式: "我叫X" / "我叫 X" / "我 叫 X" / "是X" (X 是 2-4 字中文)
 */
function extractName(transcript: string): { name: string; rest: string } | null {
  // 优先级 1: "我叫X" 后面 2-4 字中文
  const m1 = transcript.match(/(?:我叫|我是|叫)\s*([\u4e00-\u9fa5]{2,4})/);
  if (m1 && m1[1]) {
    return {
      name: m1[1],
      rest: transcript.replace(m1[0], '').trim(),
    };
  }
  // 优先级 2: "甲方/乙方/父/母/子女/赠与人/受赠人 X" 后面 2-4 字中文
  const m2 = transcript.match(/(?:甲方|乙方|男方|女方|父[\\/]母A|父[\\/]母B|子女|孩子|受赠人|赠与人|夫妻一方)\s*(?:姓名[是为]?)?\s*([\u4e00-\u9fa5]{2,4})/);
  if (m2 && m2[1]) {
    return {
      name: m2[1],
      rest: transcript.replace(m2[0], '').trim(),
    };
  }
  return null;
}

/**
 * 从文本中提取数字
 */
function extractNumber(transcript: string, range?: [number, number]): { num: number; rest: string } | null {
  const m = transcript.match(NUMBER);
  if (!m) return null;
  const n = parseInt(m[0], 10);
  if (isNaN(n)) return null;
  if (range && (n < range[0] || n > range[1])) return null;
  return {
    num: n,
    rest: transcript.replace(m[0], '').trim(),
  };
}

/**
 * 从文本中提取金额 (纯数字)
 */
function extractMoney(transcript: string): { num: number; rest: string } | null {
  const m = transcript.match(MONEY);
  if (!m) return null;
  let n = parseFloat(m[1]);
  // "万" 转换
  if (m[0].includes('万')) n *= 10000;
  if (isNaN(n) || n < 0) return null;
  return {
    num: n,
    rest: transcript.replace(m[0], '').trim(),
  };
}

/**
 * 提取第一个"是/否"关键词
 */
function extractYesNo(transcript: string, dict: Record<string, string>): { val: string; rest: string } | null {
  for (const [kw, val] of Object.entries(dict)) {
    if (transcript.includes(kw)) {
      return {
        val,
        rest: transcript.replace(kw, '').trim(),
      };
    }
  }
  return null;
}

/**
 * 从文本中提取第一个 radio 匹配值
 * (用于"已婚/未婚"等一对一关键词)
 */
function extractRadioValue(transcript: string, options: { value: string; label: string }[]): { val: string; rest: string } | null {
  for (const opt of options) {
    if (transcript.includes(opt.value) || transcript.includes(opt.label)) {
      return {
        val: opt.value,
        rest: transcript.replace(opt.value, '').replace(opt.label, '').trim(),
      };
    }
  }
  return null;
}

// ============================================================================
// 主函数: 把一段语音转成字段填充建议
// ============================================================================

/**
 * 字段已被填值 (string 非空 / number 有效 / array 至少 1 项) → 跳过
 * 避免覆盖用户已填的内容
 */
function isFieldFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return !isNaN(value);
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'boolean') return value === true;
  return false;
}

/**
 * 对单个 module (页) 的所有问题, 尝试用 transcript 填充空白字段
 *
 * @param transcript - 语音识别出的原始文本
 * @param module - 当前模块 (页)
 * @param formData - 当前表单状态
 * @returns FillReport 包含成功填充的字段 + 未匹配的片段
 */
export function fillFromVoice(
  transcript: string,
  module: Module,
  formData: Record<string, unknown>
): FillReport {
  const filled: FillResult[] = [];
  let rest = transcript.trim();
  const totalChars = rest.length;

  if (!rest) {
    return { filled, unmatched: [], totalChars: 0 };
  }

  // ── 阶段 1: 高优先级提取 (身份证 / 手机号) ──
  // 身份证
  const idM = rest.match(ID_CARD_18) || rest.match(ID_CARD_15);
  if (idM) {
    const idValue = idM[0].toUpperCase();
    const idField = module.questions.find(
      (q) => q.type === 'text' && /idcard|身份证|证件号/i.test(q.key + q.question)
    );
    if (idField && !isFieldFilled(formData[idField.key])) {
      filled.push({
        fieldKey: idField.key,
        value: idValue,
        rule: 'idcard-regex',
        display: `身份证号 ${idValue.slice(0, 6)}****${idValue.slice(-4)}`,
      });
      rest = rest.replace(idM[0], '').trim();
    }
  }

  // 手机号
  const phoneM = rest.match(PHONE);
  if (phoneM) {
    const phoneField = module.questions.find(
      (q) => q.type === 'text' && /phone|手机|电话/i.test(q.key + q.question)
    );
    if (phoneField && !isFieldFilled(formData[phoneField.key])) {
      filled.push({
        fieldKey: phoneField.key,
        value: phoneM[0],
        rule: 'phone-regex',
        display: `手机号 ${phoneM[0].slice(0, 3)}****${phoneM[0].slice(-4)}`,
      });
      rest = rest.replace(phoneM[0], '').trim();
    }
  }

  // ── 阶段 2: 姓名 (中文 2-4 字) ──
  const nameResult = extractName(rest);
  if (nameResult) {
    const nameField = module.questions.find(
      (q) => q.type === 'text' && /name|姓名/i.test(q.key + q.question) && !/id|card|身份证|证件/i.test(q.key + q.question)
    );
    if (nameField && !isFieldFilled(formData[nameField.key])) {
      filled.push({
        fieldKey: nameField.key,
        value: nameResult.name,
        rule: 'name-keyword',
        display: `姓名 "${nameResult.name}"`,
      });
      rest = nameResult.rest;
    }
  }

  // ── 阶段 3: 数字字段 (年龄/年限/人数/金额) ──
  const numberFields = module.questions.filter(
    (q) => q.type === 'number' && !isFieldFilled(formData[q.key])
  );
  for (const nf of numberFields) {
    const kw = (nf.key + ' ' + nf.question).toLowerCase();
    let result: { num: number; rest: string } | null = null;

    if (/age|年[龄龄]|周岁/.test(kw)) {
      result = extractNumber(rest, [0, 150]);
    } else if (/money|金额|价值|元|钱|月.*费|抚养费/.test(kw)) {
      result = extractMoney(rest) || extractNumber(rest, [1, 100000000]);
    } else if (/年[限]|结婚|婚龄|年限/.test(kw)) {
      result = extractNumber(rest, [0, 100]);
    } else if (/人[数口]|count|孩子数|子女数/.test(kw)) {
      result = extractNumber(rest, [0, 20]);
    } else {
      // 普通 number 字段, 任何数字
      result = extractNumber(rest, [0, 9999]);
    }

    if (result) {
      filled.push({
        fieldKey: nf.key,
        value: result.num,
        rule: 'number-regex',
        display: `${nf.question}: ${result.num}`,
      });
      rest = result.rest;
    }
  }

  // ── 阶段 4: 日期 (婚姻日期/离婚日期/生效日期等) ──
  const dateField = module.questions.find(
    (q) => q.type === 'text' && /date|日期|登记|生效|结婚|离婚/.test(q.key + q.question) && !isFieldFilled(formData[q.key])
  );
  if (dateField) {
    const m = rest.match(DATE_FULL) || rest.match(DATE_SHORT);
    if (m) {
      let dateStr = '';
      if (m.length === 4) {
        // 完整日期 2026-08-15
        dateStr = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
      } else if (m.length === 3) {
        // 短日期 8月15日, 补当年
        const year = new Date().getFullYear();
        dateStr = `${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
      }
      if (dateStr) {
        filled.push({
          fieldKey: dateField.key,
          value: dateStr,
          rule: 'date-regex',
          display: `${dateField.question}: ${dateStr}`,
        });
        rest = rest.replace(m[0], '').trim();
      }
    }
  }

  // ── 阶段 5: radio 字段 (是/否 / 婚姻 / 选项匹配) ──
  const radioFields = module.questions.filter(
    (q) => q.type === 'radio' && q.options && !isFieldFilled(formData[q.key])
  );
  for (const rf of radioFields) {
    const kw = (rf.key + ' ' + rf.question).toLowerCase();
    let result: { val: string; rest: string } | null = null;

    if (/婚姻|marital/.test(kw)) {
      result = extractYesNo(rest, MARRIAGE_KEYWORDS);
    } else if (/是否有|是否有无|有.*吗|有.*否/.test(kw)) {
      // 有/无 模式
      result = extractYesNo(rest, HAS_CHILDREN_KEYWORDS);
      if (!result) {
        // 选项里恰好只有"是/否"
        const yesNoOpts = rf.options!.filter(o => ['是', '否', '有', '无'].includes(o.value));
        if (yesNoOpts.length) {
          result = extractRadioValue(rest, yesNoOpts);
        }
      }
    } else {
      // 一般 radio, 试选项 value / label 关键词
      result = extractRadioValue(rest, rf.options!);
    }

    if (result) {
      filled.push({
        fieldKey: rf.key,
        value: result.val,
        rule: 'radio-keyword',
        display: `${rf.question}: ${result.val}`,
      });
      rest = result.rest;
    }
  }

  // ── 阶段 6: checkbox 字段 (多选, 命中即勾选) ──
  const checkboxFields = module.questions.filter(
    (q) => q.type === 'checkbox' && q.options && !isFieldFilled(formData[q.key])
  );
  for (const cf of checkboxFields) {
    const matched: string[] = [];
    let newRest = rest;
    for (const opt of cf.options!) {
      // 多个匹配: 文本里同时包含 value 和 label 都算
      if (newRest.includes(opt.value) || newRest.includes(opt.label)) {
        matched.push(opt.value);
        newRest = newRest.replace(opt.value, '').replace(opt.label, '');
      }
    }
    if (matched.length > 0) {
      filled.push({
        fieldKey: cf.key,
        value: matched,
        rule: 'checkbox-keyword',
        display: `${cf.question}: ${matched.join('、')}`,
      });
      rest = newRest.trim();
    }
  }

  // ── 阶段 7: 剩余文本 → 第一个空的 textarea (作为详细说明/具体事项) ──
  if (rest.trim()) {
    const textareaField = module.questions.find(
      (q) => q.type === 'textarea' && !isFieldFilled(formData[q.key])
    );
    if (textareaField) {
      filled.push({
        fieldKey: textareaField.key,
        value: rest.trim(),
        rule: 'textarea-fallback',
        display: `${textareaField.question} (剩余文本)`,
      });
      rest = '';
    }
  }

  // ── 报告: 收集未匹配片段 (供 UI 提示) ──
  const unmatched = rest.trim()
    ? [rest.trim()].filter(s => s.length > 0)
    : [];

  return {
    filled,
    unmatched,
    totalChars,
  };
}

/**
 * 把 FillResult 应用到 formData, 返回新的 formData
 * 不修改原对象 (immutable update)
 */
export function applyFillResults(
  formData: Record<string, unknown>,
  results: FillResult[]
): Record<string, unknown> {
  const next = { ...formData };
  for (const r of results) {
    next[r.fieldKey] = r.value;
  }
  return next;
}
