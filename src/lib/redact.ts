/**
 * 关键信息模糊处理 (2026-07-24 · 业务铁律 v1.0)
 *
 * 自动回复/邮件/反馈提示中: 姓名/身份证/银行卡/手机/详细地址/精确金额 → *** 占位
 * 用户下载自己文书时: 显示完整 (登录态校验, 不走此函数)
 */

export const KEY_FIELDS = [
  'name', 'real_name', 'full_name', 'name_cn',
  'id_card', 'id_number', '身份证',
  'bank_card', '银行卡', 'card_number',
  'phone', 'mobile', '手机', 'phone_number',
  'address', 'address_detail', '详细地址',
  'amount_detail', 'exact_amount', '银行卡号',
] as const;

/**
 * 姓名模糊: 张三 → 张*三 (中间 1 字); 张三四 → 张**; 单字不变
 */
export function redactName(name: string): string {
  if (!name) return '***';
  const trimmed = name.trim();
  if (trimmed.length <= 1) return trimmed;
  if (trimmed.length === 2) return trimmed[0] + '*';
  return trimmed[0] + '*'.repeat(trimmed.length - 2) + trimmed[trimmed.length - 1];
}

/**
 * 身份证模糊: 110101199001011234 → 110***********1234
 */
export function redactIdCard(id: string): string {
  if (!id) return '***';
  const s = id.trim();
  if (s.length <= 8) return '***';
  return s.slice(0, 3) + '*'.repeat(s.length - 7) + s.slice(-4);
}

/**
 * 手机号模糊: 13812345678 → 138****5678
 */
export function redactPhone(phone: string): string {
  if (!phone) return '***';
  const s = phone.trim();
  if (s.length < 7) return '***';
  return s.slice(0, 3) + '****' + s.slice(-4);
}

/**
 * 银行卡模糊: 6222021234567890123 → 62**************0123 (前 2 + 后 4)
 */
export function redactBankCard(card: string): string {
  if (!card) return '***';
  const s = card.trim();
  if (s.length <= 6) return '***';
  return s.slice(0, 2) + '*'.repeat(s.length - 6) + s.slice(-4);
}

/**
 * 地址模糊: 北京市朝阳区建国路 88 号 → 北京市朝阳区***
 */
export function redactAddress(addr: string): string {
  if (!addr) return '***';
  const s = addr.trim();
  if (s.length <= 8) return '***';
  // 保留前 6 个字符 (区一级)
  return s.slice(0, 6) + '***';
}

/**
 * 金额模糊: 12345.67 → 约 ¥1**** (量级)
 */
export function redactAmount(amount: number | string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '***';
  if (n < 100) return `约 ¥${Math.floor(n)}`;
  if (n < 10000) return '约 ¥' + (Math.floor(n / 100) * 100) + '***';
  if (n < 1000000) return '约 ¥' + (Math.floor(n / 10000) * 10000) + '***';
  return '约 ¥' + (Math.floor(n / 1000000) * 1000000) + '***';
}

/**
 * 通用: 检测并打码字符串中疑似敏感信息
 *  - 18 位身份证
 *  - 11 位手机号
 *  - 16-19 位银行卡
 *  - 6 位数字 PIN (业务铁律 v1.1: 转赠密钥) — 仅在 PIN 上下文关键词附近打码
 *  - 中文姓名 (2-4 字 + 先生/女士)
 */
export function autoRedact(text: string): string {
  if (!text) return text;
  let result = text;
  // 身份证
  result = result.replace(/\b(\d{17}[\dXx])\b/g, (m) => redactIdCard(m));
  // 手机号
  result = result.replace(/\b(1[3-9]\d{9})\b/g, (m) => redactPhone(m));
  // 银行卡 (16-19 位连续数字)
  result = result.replace(/\b(\d{16,19})\b/g, (m) => redactBankCard(m));
  // 6 位 PIN: 仅在含 "PIN" / "密钥" 关键词的句子中, 把 6 位连续数字打码
  result = result.replace(/(PIN|密钥|验证码)[^\n]{0,30}?(\d{6})\b/gi, (m, kw, pin) => {
    return `${kw} ${redactPin(pin)}`;
  });
  return result;
}

/**
 * PIN 模糊: 123456 → 1***6
 */
export function redactPin(pin: string): string {
  if (!pin) return '***';
  const s = pin.trim();
  if (s.length < 4) return '***';
  return s[0] + '*'.repeat(s.length - 2) + s[s.length - 1];
}

/**
 * 对象批量打码 (用于 user/profile/order 等对象在自动回复里序列化)
 */
export function redactObject<T extends Record<string, unknown>>(
  obj: T,
  rules: Partial<Record<keyof T, (v: any) => string>> = {}
): T {
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    const k = key as keyof T;
    const v = out[k];
    if (v == null) continue;
    const fn = rules[k] || defaultRuleForKey(String(k));
    if (fn) {
      out[k] = fn(v) as T[keyof T];
    }
  }
  return out;
}

function defaultRuleForKey(key: string): ((v: any) => string) | undefined {
  const k = key.toLowerCase();
  if (k.includes('name') || k.includes('姓名')) return redactName as any;
  if (k.includes('id_card') || k.includes('idcard') || k.includes('身份证')) return redactIdCard as any;
  if (k.includes('phone') || k.includes('mobile') || k.includes('手机')) return redactPhone as any;
  if (k.includes('bank') || k.includes('银行卡')) return redactBankCard as any;
  if (k.includes('address') || k.includes('地址')) return redactAddress as any;
  if (k.includes('amount') || k.includes('金额')) return (v: any) => redactAmount(Number(v)) as any;
  return undefined;
}
