'use client';

import { useState } from 'react';
import { getDictionary, type Locale } from '@/lib/i18n';

interface Props {
  locale: Locale;
  onChange?: (checked: boolean, country: string) => void;
  required?: boolean;
}

// 强制合规勾选 (海外用户身份 + 法律告知)
// 改版 v1 (2026-07-16, 全球化项目 W1.4)
//
// 用法:
//   <GlobalComplianceConsent locale={locale} required onChange={(ok, country) => ...} />
//
// 落地数据: POST /api/compliance/consent
//   - consent_type: 'cross_border_user_identity'
//   - overseas_country: 'US' / 'GB' / 'SG' / null (国内)
//   - consent_text: 当前文案快照
export default function GlobalComplianceConsent({ locale, onChange, required = true }: Props) {
  const dict = getDictionary(locale);
  const [checked, setChecked] = useState(false);
  const [country, setCountry] = useState<string>('');

  const handleCheck = (v: boolean) => {
    if (required && !v) return;
    setChecked(v);
    onChange?.(v, country);
  };

  const handleCountry = (v: string) => {
    setCountry(v);
    if (checked) onChange?.(true, v);
  };

  return (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50/60 p-4 text-sm space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-600 text-white text-xs font-semibold">
          {dict.compliance.globalBadge}
        </span>
        <span className="text-xs text-amber-800">{dict.compliance.overseasNotice}</span>
      </div>

      <div className="space-y-2">
        <div className="font-semibold text-amber-900">{dict.compliance.disclaimerTitle}</div>
        <p className="text-xs leading-relaxed text-amber-900/90 whitespace-pre-line">
          {dict.compliance.disclaimerBody}
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-amber-900 mb-1">
          {locale === 'zh-CN' ? '您的当前居住国 (选填)' : 'Country of residence (optional)'}
        </label>
        <select
          value={country}
          onChange={(e) => handleCountry(e.target.value)}
          className="w-full rounded border border-amber-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">
            {locale === 'zh-CN' ? '中国大陆 (Mainland China)' : 'Mainland China'}
          </option>
          <option value="US">🇺🇸 United States</option>
          <option value="GB">🇬🇧 United Kingdom</option>
          <option value="SG">🇸🇬 Singapore</option>
          <option value="CA">🇨🇦 Canada</option>
          <option value="AU">🇦🇺 Australia</option>
          <option value="HK">🇭🇰 Hong Kong</option>
          <option value="OTHER">
            {locale === 'zh-CN' ? '其他海外 (Other)' : 'Other overseas'}
          </option>
        </select>
      </div>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => handleCheck(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-amber-600"
          required={required}
        />
        <span className="text-xs text-amber-900 font-medium">
          {dict.compliance.overseasCheckbox}
        </span>
      </label>

      <p className="text-xs text-amber-700/80 pt-2 border-t border-amber-200">
        {dict.compliance.piplNotice}
      </p>
    </div>
  );
}
