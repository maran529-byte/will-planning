// 国际化字典 (零预算版 - 仅翻译导航/按钮/合规文案)
// 改版 v1 (2026-07-16, 全球化项目 W1.3)
//
// 文案原则:
//   - 法律内容仍为中文 (用户是中国公民, 文书用中文)
//   - 英文文案面向海外华人 (marketing/UI only)
//   - 合规文案必须中英双语 (强制法务告知)
//
// 添加新 key 时, 同步更新 zh-CN 和 en-US

export type Locale = 'zh-CN' | 'en-US';

export const dictionaries = {
  'zh-CN': {
    nav: {
      home: '首页',
      prenup: '婚前协议',
      postnup: '婚内财产',
      divorce: '离婚协议',
      custody: '子女抚养',
      gift: '赠与协议',
      will: '遗嘱继承',
      pricing: '价格',
      about: '关于我们',
      login: '登录',
      register: '注册',
      dashboard: '我的',
    },
    cta: {
      start: '立即开始',
      generate: '生成文书',
      pay: '立即支付',
      payNow: '¥19.9 起',
      learnMore: '了解更多',
      consultLawyer: '咨询律师',
    },
    hero: {
      title: '婚姻财产与资产规划智能平台',
      subtitle: '10 分钟帮您整理好婚前/婚内/离婚/抚养/赠与/继承 6 类家庭文书',
      priceFrom: '¥19.9 起',
    },
    compliance: {
      globalBadge: '全球华人法律文书平台',
      overseasNotice: '本平台面向中国籍公民及海外华人, 文书语言为简体中文, 适用中华人民共和国法律。',
      disclaimerTitle: '强制法律告知',
      disclaimerBody:
        '本人确认: 我是中国公民, 或持中国身份证/护照的海外华人。本平台不向我提供境外法律服务, 不构成境外法律意见。具体案件请咨询中国执业律师 (中国大陆) 及所在国执业律师 (境外)。',
      overseasCheckbox: '我已阅读并同意以上法律告知',
      piplNotice: '个人信息按《个人信息保护法》处理, 跨境传输场景另行单独同意。',
    },
    legal: {
      icp: '沪ICP备 2024xxxxxx 号',
      police: '沪公网安备 31011502406720 号',
    },
    pricing: {
      single: '单份文书',
      plus: '律师审档',
      bundle: '家庭组合 (3份)',
      currency: '人民币',
    },
    doc: {
      prenup: '婚前财产协议',
      postnup: '婚内财产协议',
      divorce: '离婚协议书',
      custody: '子女抚养协议',
      gift: '赠与协议',
      will: '遗嘱继承规划',
    },
    overseas: {
      // 海外华人专区
      crossBorderBadge: '跨境家事法律',
      title: '全球华人的家事法律文书工具',
      subtitle: '中文文书 · 海外可访问 · 微信支付 · 中华人民共和国法律框架',
      foreignAsset: '跨境财产申报',
      foreignParty: '涉外婚姻',
      foreignResidency: '海外居住',
      applicableLaw: '准据法: 中华人民共和国法律',
    },
  },
  'en-US': {
    nav: {
      home: 'Home',
      prenup: 'Prenup',
      postnup: 'Postnup',
      divorce: 'Divorce',
      custody: 'Custody',
      gift: 'Gift',
      will: 'Will & Estate',
      pricing: 'Pricing',
      about: 'About',
      login: 'Sign in',
      register: 'Register',
      dashboard: 'Dashboard',
    },
    cta: {
      start: 'Get started',
      generate: 'Generate',
      pay: 'Pay now',
      payNow: 'From $29 USD',
      learnMore: 'Learn more',
      consultLawyer: 'Consult lawyer',
    },
    hero: {
      title: 'Marriage & Family Asset Planning Platform',
      subtitle: 'Generate 6 types of family legal documents in 10 minutes',
      priceFrom: 'From $29 USD',
    },
    compliance: {
      globalBadge: 'Global Chinese Legal Docs Platform',
      overseasNotice:
        "This platform serves Chinese citizens and overseas Chinese. Documents are in Simplified Chinese, governed by the laws of the People's Republic of China.",
      disclaimerTitle: 'Mandatory Legal Notice',
      disclaimerBody:
        'I confirm: I am a Chinese citizen, or an overseas Chinese holding a Chinese ID card/passport. This platform does not provide legal services in foreign jurisdictions and does not constitute foreign legal advice. Please consult a licensed attorney in mainland China and in your country of residence.',
      overseasCheckbox: 'I have read and agree to the above legal notice',
      piplNotice:
        'Personal data is processed in accordance with the Personal Information Protection Law (PIPL). Cross-border transfer requires separate consent.',
    },
    legal: {
      icp: 'Shanghai ICP No. 2024xxxxxx',
      police: 'Shanghai Police No. 31011502406720',
    },
    pricing: {
      single: 'Single document',
      plus: 'Lawyer review',
      bundle: 'Family bundle (3)',
      currency: 'USD',
    },
    doc: {
      prenup: 'Prenuptial Agreement',
      postnup: 'Postnuptial Agreement',
      divorce: 'Divorce Agreement',
      custody: 'Child Custody Agreement',
      gift: 'Gift Agreement',
      will: 'Will & Estate Planning',
    },
    overseas: {
      crossBorderBadge: 'Cross-Border Family Law',
      title: 'Legal Document Tool for Global Chinese',
      subtitle:
        'Chinese documents · Accessible worldwide · WeChat Pay · Governed by PRC law',
      foreignAsset: 'Cross-border assets',
      foreignParty: 'Foreign spouse',
      foreignResidency: 'Overseas residency',
      applicableLaw: 'Governing law: PRC law',
    },
  },
} as const;

export type Dictionary = (typeof dictionaries)['zh-CN'];

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] as Dictionary;
}

export function detectLocaleFromCookie(cookieValue: string | undefined): Locale {
  if (cookieValue === 'en-US') return 'en-US';
  return 'zh-CN';
}
