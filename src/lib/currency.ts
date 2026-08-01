// 多币种展示工具 (海外华人项目 W2.1)
//
// 设计原则 (零预算):
//   - 法定支付货币仍是 CNY (虎皮椒/微信支付)
//   - 仅在 UI 层展示 USD/GBP/SGD 估算价 (供海外华人心里有数)
//   - 不做汇率 API (避免增加外部依赖), 使用 2026-07 静态汇率, 季度手动更新
//   - 明确告知: 实际扣款以人民币为准, 汇率波动不另行通知
//
// 汇率表来源 (手工校对, 2026-07):
//   USD: 1 USD = 7.20 CNY
//   GBP: 1 GBP = 9.15 CNY
//   SGD: 1 SGD = 5.35 CNY

export type DisplayCurrency = 'CNY' | 'USD' | 'GBP' | 'SGD';

export interface CurrencyInfo {
  code: DisplayCurrency;
  symbol: string;
  label: string;        // 用于 "约 $29 USD" 提示
  cnyPerUnit: number;   // 1 单位外币 = 多少人民币
}

export const CURRENCY_TABLE: Record<DisplayCurrency, CurrencyInfo> = {
  CNY: { code: 'CNY', symbol: '¥',  label: '人民币', cnyPerUnit: 1     },
  USD: { code: 'USD', symbol: '$',  label: 'USD',    cnyPerUnit: 7.20  },
  GBP: { code: 'GBP', symbol: '£',  label: 'GBP',    cnyPerUnit: 9.15  },
  SGD: { code: 'SGD', symbol: 'S$', label: 'SGD',    cnyPerUnit: 5.35  },
};

// 根据 locale 选币种: en-US 用 USD, zh-CN 用 CNY (其他语种默认 USD)
export function currencyForLocale(locale: string | null | undefined): DisplayCurrency {
  if (locale === 'zh-CN') return 'CNY';
  return 'USD';
}

// 人民币 → 目标币种
//   - 用 Math.ceil 保证 "不少于" 心理价位
//   - 返回两位小数
export function convertFromCNY(cnyAmount: number, target: DisplayCurrency): number {
  const info = CURRENCY_TABLE[target];
  if (info.cnyPerUnit === 1) return cnyAmount;
  const foreign = cnyAmount / info.cnyPerUnit;
  return Math.ceil(foreign * 100) / 100;
}

// 人民币价 → 显示字符串 (含货币符号)
//   - cny=19.9, target=USD → "$3"
//   - cny=999, target=USD → "$139"
//   - cny=19.9, target=CNY → "¥19.9"
export function formatPrice(cnyAmount: number, target: DisplayCurrency): string {
  const info = CURRENCY_TABLE[target];
  if (target === 'CNY') {
    // 保留 1 位小数 (符合现状)
    return `${info.symbol}${cnyAmount.toFixed(cnyAmount % 1 === 0 ? 0 : 1)}`;
  }
  const foreign = convertFromCNY(cnyAmount, target);
  // 整数无小数, 小数保留 2 位
  return `${info.symbol}${foreign.toFixed(foreign % 1 === 0 ? 0 : 2)}`;
}

// 带 "约" 字提示 (海外华人专用)
//   - 当 cny=19.9, target=USD → "约 $3 USD"
//   - 当 cny=999, target=USD → "约 $139 USD"
//   - 当 target=CNY → "¥19.9" (不加 "约")
export function formatPriceHint(cnyAmount: number, target: DisplayCurrency): string {
  const display = formatPrice(cnyAmount, target);
  if (target === 'CNY') return display;
  return `约 ${display} ${target}`;
}

// 完整提示行: "应付 ¥19.9 (约 $3 USD) · 实际扣款以人民币为准"
// 仅当 target !== CNY 时显示 "约 X" 部分
export function formatPriceWithSettlement(cnyAmount: number, target: DisplayCurrency): string {
  const cnyDisplay = formatPrice(cnyAmount, 'CNY');
  if (target === 'CNY') return cnyDisplay;
  return `${cnyDisplay} (${formatPriceHint(cnyAmount, target)})`;
}
