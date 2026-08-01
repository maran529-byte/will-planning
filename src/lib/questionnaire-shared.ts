// 5 类非遗嘱文书的问卷配置 (Day 2 上线: 婚姻/婚内财产/离婚/子女抚养/赠与)
// 每类 4-5 个 module, 总计 15-18 题 (MVP 版, 商业闭环够用)
//
// 设计原则:
//   1. 题型尽量 radio/checkbox (高转化, 用户不易放弃)
//   2. 复用 will 的 Question/Module 类型 (lib/questionnaire.ts 共享)
//   3. 关键字段至少 1 个 textarea 自由输入 (姓名/地址/具体事项)
//   4. 末尾"确认签署"模块统一, 法律免责声明一致

import type { Module } from './questionnaire';

// ============================================================================
// 共享前置模块 (合规闸门: 立场 + 行为能力 + 冲突检测)
//   6 类文书统一使用, 避免重复维护
//   依据: 民法典§143 行为能力, §150-151 胁迫/欺诈, §1142 遗嘱以最后为准
// ============================================================================
const PREFLIGHT_MODULES: Module[] = [
  // P1: 立场确认 (本人代双方 / 双方已协商 / 仅本人)
  {
    id: 'preflight-standing',
    title: '立场确认',
    description: '依据《民法典》§150-151, 文书须为双方真实意思表示',
    icon: '🤝',
    questions: [
      {
        id: 'pf1', key: 'filingStanding', type: 'radio',
        question: '本次填写代表谁?',
        hint: '⚠️ 文书须双方当面签署, 单方填写不代表对方同意',
        required: true,
        options: [
          { value: '本人代双方', label: '本人代双方填写 (草稿用, 双方仍须各自签字确认)' },
          { value: '双方已协商一致', label: '双方已协商一致 (代为录入)' },
          { value: '仅本人', label: '仅本人意见 (单方草稿)' },
        ],
      },
    ],
  },
  // P2: 行为能力 + 自愿性声明
  {
    id: 'preflight-declare',
    title: '行为能力与自愿声明',
    description: '依据《民法典》§143, §150-151',
    icon: '✅',
    questions: [
      {
        id: 'pf2', key: 'hasFullCapacity', type: 'radio',
        question: '双方均为完全民事行为能力人, 填写时意识清醒, 无受胁迫/欺诈情况',
        hint: '若任一方为限制民事行为能力者 (如精神障碍、认知障碍老人), 须通过法定代理人操作',
        required: true,
        options: [
          { value: '是', label: '是, 双方均具备完全民事行为能力, 自愿填写' },
          { value: '否', label: '否, 或存在不确定' },
        ],
      },
    ],
  },
  // P3: 冲突检测
  {
    id: 'preflight-conflict',
    title: '冲突检测',
    description: '依据《民法典》§1142 (遗嘱以最后一份为准)',
    icon: '🔍',
    questions: [
      {
        id: 'pf3', key: 'hasPriorDoc', type: 'radio',
        question: '双方此前是否已签订过相关文书 (婚前协议/婚内协议/离婚协议等)?',
        hint: '有则新文书应明确声明撤销/变更前文书对应条款',
        required: true,
        options: [
          { value: '无', label: '无, 此前未签订过相关文书' },
          { value: '有同类型', label: '有同类型文书' },
          { value: '有其他类型', label: '有其他类型相关文书' },
        ],
      },
      {
        id: 'pf3b', key: 'priorDocDetail', type: 'textarea',
        question: '请描述已有文书的类型与签订时间',
        required: false,
        placeholder: '如: 2018年签订婚前财产协议; 2020年签订婚内财产协议一份',
      },
    ],
  },
];

// ============================================================================
// 共享结构化财产明细模块 (婚姻/婚内/离婚/赠与 4 类使用)
//   6 类关键字段: 房产/车辆/银行/股权/保险/数字资产
//   依据合规审查 #6: 自由文本导致产权证号/账号尾号遗漏
// ============================================================================
const ASSETS_STRUCTURED_MODULE: Module = {
  id: 'assets-structured',
  title: '财产明细 (结构化)',
  description: '为确保文书精度, 请逐项补充关键字段 (产权证号/账号/受益人等)',
  icon: '📋',
  questions: [
    {
      id: 'as1', key: 'hasRealEstate', type: 'radio',
      question: '是否有房产需要列入?',
      required: true,
      options: [
        { value: '无', label: '无' },
        { value: '有', label: '有 (需填写产权证号)' },
      ],
    },
    {
      id: 'as1b', key: 'realEstateDetail', type: 'textarea',
      question: '房产明细 (产权证号 / 地址 / 面积 / 共有情况)',
      required: false,
      placeholder: '如: 京(2020)朝不动产权第XXXX号; 朝阳区XX路1201室; 89㎡; 单独所有',
    },
    {
      id: 'as2', key: 'hasVehicle', type: 'radio',
      question: '是否有车辆需要列入?',
      required: true,
      options: [
        { value: '无', label: '无' },
        { value: '有', label: '有 (需填写车牌/行驶证)' },
      ],
    },
    {
      id: 'as2b', key: 'vehicleDetail', type: 'textarea',
      question: '车辆明细 (车牌号 / 车型 / 车架号)',
      required: false,
      placeholder: '如: 京A·XXXXX; 丰田凯美瑞2023款; 车架号LHGCM1...',
    },
    {
      id: 'as3', key: 'hasBankAccount', type: 'radio',
      question: '是否有银行账户/存款需要列入?',
      required: true,
      options: [
        { value: '无', label: '无' },
        { value: '有', label: '有 (需填写开户行/账号尾号)' },
      ],
    },
    {
      id: 'as3b', key: 'bankAccountDetail', type: 'textarea',
      question: '银行账户明细 (开户行 / 账号尾4位 / 币种 / 余额区间)',
      required: false,
      placeholder: '如: 中国工商银行北京分行, 尾号1234, 人民币, 余额约50万',
    },
    {
      id: 'as4', key: 'hasEquity', type: 'radio',
      question: '是否持有公司股权/股票基金?',
      required: true,
      options: [
        { value: '无', label: '无' },
        { value: '有', label: '有 (需填写公司名/股票代码/持股比例)' },
      ],
    },
    {
      id: 'as4b', key: 'equityDetail', type: 'textarea',
      question: '股权/股票基金明细 (公司名 / 股票代码 / 持股比例)',
      required: false,
      placeholder: '如: XX科技有限公司, 持股30%; 或 平安银行(000001), 持股10000股',
    },
    {
      id: 'as5', key: 'hasInsurance', type: 'radio',
      question: '是否拥有人寿保险?',
      required: true,
      options: [
        { value: '无', label: '无' },
        { value: '有', label: '有 (需填写保单号/受益人)' },
      ],
    },
    {
      id: 'as5b', key: 'insurancePolicyDetail', type: 'textarea',
      question: '保单明细 (保险公司 / 保单号 / 受益人)',
      required: false,
      placeholder: '如: 中国人寿, 保单号XXX, 受益人: 配偶张三',
    },
    {
      id: 'as6', key: 'hasDigitalAsset', type: 'radio',
      question: '是否持有数字资产 (加密货币/网络店铺/重要自媒体账号)?',
      required: true,
      options: [
        { value: '无', label: '无' },
        { value: '有', label: '有 (需填写账号/钱包地址)' },
      ],
    },
    {
      id: 'as6b', key: 'digitalAssetDetail', type: 'textarea',
      question: '数字资产明细 (账号ID / 钱包地址 / 平台)',
      required: false,
      placeholder: '如: 公众号"家有所爱"(ID: gh_xxxxx); BTC钱包 0x...',
    },
  ],
};

// ============================================================================
// 1. 婚姻协议书 (婚前财产 + 婚后权利义务约定)
// ============================================================================
export const marriageModules: Module[] = [
  ...PREFLIGHT_MODULES,
  {
    id: 'parties',
    title: '双方基本信息',
    description: '请填写双方的基本情况',
    icon: '💑',
    questions: [
      { id: 'm1', key: 'partyAName', type: 'text', question: '甲方姓名', required: true, placeholder: '男方/女方的真实姓名' },
      { id: 'm2', key: 'partyAIdCard', type: 'text', question: '甲方身份证号 (18位)', required: true, hint: '依据《民法典》第469条, 法院/公证处核验时需核对身份证号与姓名一致性', placeholder: '请输入 18 位身份证号' },
      { id: 'm3', key: 'partyBName', type: 'text', question: '乙方姓名', required: true, placeholder: '另一方真实姓名' },
      { id: 'm4', key: 'partyBIdCard', type: 'text', question: '乙方身份证号 (18位)', required: true, placeholder: '请输入 18 位身份证号' },
      { id: 'm5', key: 'marriageDate', type: 'text', question: '拟登记结婚日期', required: true, placeholder: '如: 2026-08-15' },
    ],
  },
  {
    id: 'property',
    title: '财产约定',
    description: '婚前/婚后财产如何归属',
    icon: '🏠',
    questions: [
      {
        id: 'm6', key: 'propertyMode', type: 'radio', question: '财产归属模式', required: true,
        options: [
          { value: 'AA制', label: 'AA制 (各自所有, 共同支出分摊)' },
          { value: '共有制', label: '共有制 (婚后收入共同所有)' },
          { value: '部分共有', label: '部分共有 (列出共有/独立项)' },
        ],
      },
      {
        id: 'm7', key: 'prenupItems', type: 'checkbox', question: '婚前个人财产 (可多选)', required: false,
        options: [
          { value: '婚前房产', label: '婚前房产' },
          { value: '婚前车辆', label: '婚前车辆' },
          { value: '婚前存款', label: '婚前存款' },
          { value: '婚前投资', label: '婚前投资/股票' },
          { value: '婚前股权', label: '婚前公司股权' },
          { value: '婚前知识产权', label: '婚前知识产权 (专利/版权/商标)' },
          { value: '婚前数字资产', label: '婚前数字资产 (自媒体/网店/加密货币)' },
        ],
      },
      { id: 'm8', key: 'prenupDetails', type: 'textarea', question: '婚前/婚后财产具体约定详情', required: false, placeholder: '如: 北京市朝阳区XX路XX号房产归甲方个人所有; 婚后工资收入共同所有' },
    ],
  },
  ASSETS_STRUCTURED_MODULE,
  {
    id: 'marriage-debt',
    title: '债务与担保',
    description: '依据《民法典》第1064-1065条, 须明确债务承担, 避免债权人追偿风险',
    icon: '💳',
    questions: [
      {
        id: 'md1', key: 'hasPersonalDebt', type: 'radio', question: '任一方是否有婚前个人贷款/欠款?', required: true,
        options: [
          { value: '无', label: '无' },
          { value: '有', label: '有 (注明债权人/金额/用途)' },
        ],
      },
      {
        id: 'md2', key: 'hasGuarantee', type: 'radio', question: '任一方是否为他人提供担保?', required: true,
        options: [
          { value: '否', label: '否' },
          { value: '是', label: '是 (配偶有知情权, 须明确约定)' },
        ],
      },
      { id: 'md3', key: 'debtArrangement', type: 'textarea', question: '婚前/婚后债务承担具体约定', required: false, placeholder: '如: 甲方婚前房贷XX万由甲方自行承担; 婚后共同房贷按收入比例承担' },
    ],
  },
  {
    id: 'obligations',
    title: '权利义务',
    description: '婚姻存续期间的权利义务',
    icon: '⚖️',
    questions: [
      {
        id: 'm9', key: 'houseworkMode', type: 'radio', question: '家务分工', required: true,
        options: [
          { value: 'AA分担', label: 'AA分担' },
          { value: '一方为主', label: '一方为主' },
          { value: '外包', label: '外包 (请保姆/钟点工)' },
        ],
      },
      {
        id: 'm10', key: 'filialSupport', type: 'radio', question: '双方父母赡养模式', required: false,
        options: [
          { value: '各自父母各自负责', label: '各自父母各自负责' },
          { value: '共同承担', label: '共同承担' },
          { value: '按比例', label: '按收入比例承担' },
        ],
      },
      { id: 'm11', key: 'specialClauses', type: 'textarea', question: '其他特殊约定', required: false, placeholder: '如: 不与对方父母同住; 子女姓氏约定; 忠诚义务等' },
    ],
  },
  {
    id: 'review-marriage',
    title: '确认签署',
    description: '请确认信息真实有效',
    icon: '✍️',
    questions: [
      {
        id: 'm12a', key: 'signingMethod', type: 'radio',
        question: '您计划如何完成签署?',
        hint: '婚前协议须双方亲笔签名; 大额资产建议办理公证',
        required: true,
        options: [
          { value: '双方亲笔', label: '双方亲笔签名 (适合大多数情况)' },
          { value: '公证', label: '请公证机构公证 (推荐大额资产)' },
        ],
      },
      {
        id: 'm12b', key: 'disputeResolution', type: 'radio',
        question: '若对本协议产生争议, 您希望通过哪种方式解决?',
        hint: '依据《民法典》第469条, 合同类文书应明确争议解决条款',
        required: true,
        options: [
          { value: '诉讼', label: '向有管辖权的人民法院提起诉讼' },
          { value: '仲裁', label: '提交仲裁机构仲裁' },
        ],
      },
      {
        id: 'm12c', key: 'arbitrationInstitution', type: 'text',
        question: '若选仲裁, 仲裁机构名称 (选填)',
        required: false,
        placeholder: '如: 北京仲裁委员会',
      },
      {
        id: 'm12d', key: 'understandLegal', type: 'radio', question: '是否了解本协议需双方签字方可生效?', required: true,
        options: [
          { value: '了解', label: '了解' },
          { value: '不了解, 需要说明', label: '不了解, 需要说明' },
        ],
      },
      {
        id: 'm13', key: 'confirmed', type: 'radio', question: '我声明以上信息真实有效, 委托系统化生成婚姻协议书草稿', required: true,
        options: [
          { value: '我同意', label: '我同意' },
          { value: '我不同意', label: '我不同意' },
        ],
      },
    ],
  },
];

// ============================================================================
// 2. 婚内财产协议 (婚后财产归属细化, 可随时签)
// ============================================================================
export const maritalPropertyModules: Module[] = [
  ...PREFLIGHT_MODULES,
  {
    id: 'mp-parties',
    title: '双方基本信息',
    description: '请填写夫妻双方信息',
    icon: '👫',
    questions: [
      { id: 'mp1', key: 'partyAName', type: 'text', question: '甲方姓名', required: true },
      { id: 'mp1b', key: 'partyAIdCard', type: 'text', question: '甲方身份证号 (18位)', required: true, placeholder: '请输入 18 位身份证号' },
      { id: 'mp2', key: 'partyBName', type: 'text', question: '乙方姓名', required: true },
      { id: 'mp2b', key: 'partyBIdCard', type: 'text', question: '乙方身份证号 (18位)', required: true, placeholder: '请输入 18 位身份证号' },
      { id: 'mp3', key: 'marriageYears', type: 'number', question: '结婚年限 (年)', required: true, placeholder: '如: 5' },
      { id: 'mp4', key: 'hasChildren', type: 'radio', question: '是否有未成年子女', required: true,
        options: [
          { value: '有', label: '有' },
          { value: '无', label: '无' },
        ],
      },
    ],
  },
  {
    id: 'mp-property',
    title: '财产约定',
    description: '婚后财产的归属调整',
    icon: '💰',
    questions: [
      {
        id: 'mp5', key: 'propertyType', type: 'checkbox', question: '需要约定的财产类型 (可多选)', required: true,
        options: [
          { value: '房产', label: '房产 (写明地址)' },
          { value: '车辆', label: '车辆' },
          { value: '存款', label: '存款' },
          { value: '股票基金', label: '股票/基金/投资' },
          { value: '公司股权', label: '公司股权' },
          { value: '知识产权', label: '知识产权 (专利/版权/商标/收益)' },
          { value: '数字资产', label: '数字资产 (自媒体/网店/加密货币)' },
          { value: '人寿保险', label: '人寿保险 (保单现金价值)' },
        ],
      },
      { id: 'mp5b', key: 'ipDigitalDetail', type: 'textarea', question: '知识产权与数字资产详情', required: false, placeholder: '如: 某公众号账号XXX, 婚后收益归属甲方; 某网店股权归乙方' },
      { id: 'mp6', key: 'propertyDetail', type: 'textarea', question: '具体财产描述 (地址/账号/数量)', required: true, placeholder: '如: 北京市朝阳区XX路XX号1201室, 房产证号 XXX' },
      {
        id: 'mp7', key: 'ownershipMode', type: 'radio', question: '归属方式', required: true,
        options: [
          { value: '归一方所有', label: '归一方所有, 另一方放弃' },
          { value: '按份共有', label: '按份共有 (注明比例)' },
          { value: '共同共有', label: '共同共有' },
        ],
      },
    ],
  },
  ASSETS_STRUCTURED_MODULE,
  {
    id: 'mp-incomedebt',
    title: '收入与债务',
    description: '工资、投资收益、债务如何分摊',
    icon: '📊',
    questions: [
      {
        id: 'mp8', key: 'incomeMode', type: 'radio', question: '婚后收入分配', required: false,
        options: [
          { value: '各归各', label: '各归各' },
          { value: '共同账户', label: '共同账户, 各按比例存入' },
          { value: '一方全数', label: '一方全数上交' },
        ],
      },
      {
        id: 'mp9', key: 'debtPolicy', type: 'radio', question: '婚后债务承担', required: true,
        options: [
          { value: '共同债务共同承担', label: '共同债务共同承担' },
          { value: '各自债务各自承担', label: '各自债务各自承担' },
          { value: '按用途承担', label: '按用途 (家庭/个人) 承担' },
        ],
      },
      {
        id: 'mp9b', key: 'isGuarantor', type: 'radio', question: '任一方是否为他人提供担保?', hint: '担保责任将影响夫妻共同财产, 须明确告知', required: true,
        options: [
          { value: '否', label: '否' },
          { value: '是', label: '是 (需注明被担保人/金额/担保类型)' },
        ],
      },
      { id: 'mp9c', key: 'debtDetail', type: 'textarea', question: '债务清单与担保详情', required: false, placeholder: '如: 甲方担保乙方之弟XX万向XX银行借款; 房贷XX万由甲方承担' },
    ],
  },
  {
    id: 'mp-review',
    title: '确认签署',
    description: '请确认信息',
    icon: '✍️',
    questions: [
      {
        id: 'mp9d', key: 'signingMethod', type: 'radio',
        question: '您计划如何完成签署?',
        required: true,
        options: [
          { value: '双方亲笔', label: '双方亲笔签名' },
          { value: '公证', label: '请公证机构公证 (推荐大额资产)' },
        ],
      },
      {
        id: 'mp9e', key: 'disputeResolution', type: 'radio',
        question: '若对本协议产生争议, 您希望通过哪种方式解决?',
        required: true,
        options: [
          { value: '诉讼', label: '向有管辖权的人民法院提起诉讼' },
          { value: '仲裁', label: '提交仲裁机构仲裁' },
        ],
      },
      {
        id: 'mp9f', key: 'arbitrationInstitution', type: 'text', question: '若选仲裁, 仲裁机构名称 (选填)', required: false, placeholder: '如: 北京仲裁委员会' },
      {
        id: 'mp10', key: 'understandLegal', type: 'radio', question: '是否了解本协议不影响人身关系, 只调整财产关系?', required: true,
        options: [
          { value: '了解', label: '了解' },
          { value: '不了解', label: '不了解' },
        ],
      },
      {
        id: 'mp11', key: 'confirmed', type: 'radio', question: '我声明以上信息真实有效', required: true,
        options: [
          { value: '我同意', label: '我同意' },
          { value: '我不同意', label: '我不同意' },
        ],
      },
    ],
  },
];

// ============================================================================
// 3. 离婚协议 (双方协议离婚, 民政局备案用)
// ============================================================================
export const divorceModules: Module[] = [
  ...PREFLIGHT_MODULES,
  {
    id: 'dv-parties',
    title: '双方基本信息',
    description: '请填写夫妻信息',
    icon: '📋',
    questions: [
      { id: 'dv1', key: 'partyAName', type: 'text', question: '男方姓名', required: true },
      { id: 'dv1b', key: 'partyAIdCard', type: 'text', question: '男方身份证号 (18位)', required: true, placeholder: '请输入 18 位身份证号' },
      { id: 'dv2', key: 'partyBName', type: 'text', question: '女方姓名', required: true },
      { id: 'dv2b', key: 'partyBIdCard', type: 'text', question: '女方身份证号 (18位)', required: true, placeholder: '请输入 18 位身份证号' },
      { id: 'dv3', key: 'marriageDate', type: 'text', question: '结婚日期', required: true, placeholder: '如: 2018-06-08' },
      { id: 'dv4', key: 'divorceReason', type: 'text', question: '离婚原因 (一句话)', required: true, placeholder: '如: 感情破裂' },
    ],
  },
  {
    id: 'dv-children',
    title: '子女安排',
    description: '抚养权与探视权',
    icon: '👶',
    questions: [
      {
        id: 'dv5', key: 'hasChildren', type: 'radio', question: '是否有未成年子女', required: true,
        options: [
          { value: '有', label: '有' },
          { value: '无', label: '无' },
        ],
      },
      {
        id: 'dv6', key: 'custodyTo', type: 'radio', question: '抚养权归属', required: false,
        options: [
          { value: '男方', label: '归男方' },
          { value: '女方', label: '归女方' },
          { value: '轮流', label: '轮流抚养' },
        ],
      },
      { id: 'dv7', key: 'childrenCount', type: 'number', question: '未成年子女人数', required: false, placeholder: '如: 1' },
      { id: 'dv8', key: 'childrenNames', type: 'text', question: '子女姓名 (多个用逗号分隔)', required: false, placeholder: '如: 张三, 张四' },
      { id: 'dv9', key: 'monthlySupport', type: 'text', question: '抚养费金额 (元/月, 含教育医疗)', required: false, placeholder: '如: 3000' },
      { id: 'dv10', key: 'visitArrangement', type: 'textarea', question: '探视权安排', required: false, placeholder: '如: 每月第 1/3 个周末探视, 寒暑假轮流陪同' },
    ],
  },
  {
    id: 'dv-property',
    title: '财产分割',
    description: '共同财产与债务分配',
    icon: '🏠',
    questions: [
      {
        id: 'dv11', key: 'propertyType', type: 'checkbox', question: '需要分割的财产 (可多选)', required: false,
        options: [
          { value: '房产', label: '房产' },
          { value: '车辆', label: '车辆' },
          { value: '存款', label: '存款' },
          { value: '股票基金', label: '股票/基金' },
          { value: '公司股权', label: '公司股权' },
          { value: '知识产权', label: '知识产权 (专利/版权/商标)' },
          { value: '数字资产', label: '数字资产 (自媒体/网店/加密货币)' },
          { value: '其他', label: '其他贵重物品' },
        ],
      },
      { id: 'dv12', key: 'propertyDetail', type: 'textarea', question: '具体财产及分割方式', required: false, placeholder: '如: 北京市朝阳区XX路1201室归女方所有, 女方补偿男方 50% 市场价' },
      {
        id: 'dv13', key: 'debtPolicy', type: 'radio', question: '共同债务承担', required: false,
        options: [
          { value: '各自承担', label: '各自名下债务各自承担' },
          { value: '按比例', label: '按协议比例承担' },
          { value: '一方承担', label: '由一方全部承担' },
        ],
      },
      {
        id: 'dv13b', key: 'isGuarantor', type: 'radio', question: '任一方是否为他人提供担保?', hint: '担保责任将影响共同财产分割, 须明确告知', required: true,
        options: [
          { value: '否', label: '否' },
          { value: '是', label: '是 (需注明被担保人/金额)' },
        ],
      },
      { id: 'dv13c', key: 'debtDetail', type: 'textarea', question: '共同债务与担保详情', required: false, placeholder: '如: 房贷XX万 (余额XX万) 由男方承担; 甲方担保XX万为乙方之弟借款' },
    ],
  },
  ASSETS_STRUCTURED_MODULE,
  {
    id: 'dv-review',
    title: '确认签署',
    description: '请确认信息',
    icon: '✍️',
    questions: [
      {
        id: 'dv13d', key: 'signingMethod', type: 'radio',
        question: '您计划如何完成签署?',
        hint: '离婚协议须双方亲笔签名, 民政局备案后生效',
        required: true,
        options: [
          { value: '双方亲笔', label: '双方亲笔签名 (民政局备案生效)' },
          { value: '公证', label: '先公证再民政局备案 (推荐大额资产)' },
        ],
      },
      {
        id: 'dv13e', key: 'disputeResolution', type: 'radio',
        question: '若对本协议产生争议, 您希望通过哪种方式解决?',
        required: true,
        options: [
          { value: '诉讼', label: '向有管辖权的人民法院提起诉讼' },
          { value: '仲裁', label: '提交仲裁机构仲裁 (人身关系不可仲裁)' },
        ],
      },
      {
        id: 'dv13f', key: 'courtJurisdiction', type: 'text', question: '约定管辖法院所在地 (选填)', required: false, placeholder: '如: 北京市朝阳区人民法院' },
      {
        id: 'dv14', key: 'isVoluntary', type: 'radio', question: '双方是否自愿离婚?', required: true,
        options: [
          { value: '是, 完全自愿', label: '是, 完全自愿' },
          { value: '否, 需调解', label: '否, 需调解' },
        ],
      },
      {
        id: 'dv15', key: 'confirmed', type: 'radio', question: '我声明以上信息真实有效, 委托系统化生成离婚协议书草稿', required: true,
        options: [
          { value: '我同意', label: '我同意' },
          { value: '我不同意', label: '我不同意' },
        ],
      },
    ],
  },
];

// ============================================================================
// 4. 子女抚养协议 (离婚后 / 非婚生 / 收养后均可)
// ============================================================================
export const childCustodyModules: Module[] = [
  ...PREFLIGHT_MODULES,
  {
    id: 'cc-parties',
    title: '当事人信息',
    description: '请填写父母与子女信息',
    icon: '👨‍👩‍👧',
    questions: [
      { id: 'cc1', key: 'parentAName', type: 'text', question: '父/母 A 姓名', required: true },
      { id: 'cc1b', key: 'parentAIdCard', type: 'text', question: '父/母 A 身份证号 (18位)', required: true, placeholder: '请输入 18 位身份证号' },
      { id: 'cc2', key: 'parentBName', type: 'text', question: '父/母 B 姓名', required: true },
      { id: 'cc2b', key: 'parentBIdCard', type: 'text', question: '父/母 B 身份证号 (18位)', required: true, placeholder: '请输入 18 位身份证号' },
      { id: 'cc3', key: 'childName', type: 'text', question: '子女姓名', required: true },
      { id: 'cc3b', key: 'childIdCard', type: 'text', question: '子女身份证号或出生证号 (选填)', required: false, placeholder: '便于法院/民政局核对身份' },
      { id: 'cc4', key: 'childAge', type: 'number', question: '子女年龄', required: true, placeholder: '如: 8' },
      {
        id: 'cc5', key: 'relationshipStatus', type: 'radio', question: '父母当前关系', required: true,
        options: [
          { value: '已离婚', label: '已离婚' },
          { value: '未婚', label: '未婚/分居' },
          { value: '已婚分居', label: '已婚分居' },
        ],
      },
    ],
  },
  {
    id: 'cc-custody',
    title: '抚养权与探视',
    description: '子女归谁, 怎么见',
    icon: '🤝',
    questions: [
      {
        id: 'cc6', key: 'custodyTo', type: 'radio', question: '主要抚养权归', required: true,
        options: [
          { value: 'parentA', label: '父/母 A' },
          { value: 'parentB', label: '父/母 B' },
          { value: 'joint', label: '共同抚养 (轮流)' },
        ],
      },
      { id: 'cc7', key: 'residence', type: 'text', question: '子女主要居住地', required: true, placeholder: '如: 北京市朝阳区XX路XX号' },
      {
        id: 'cc8', key: 'visitFrequency', type: 'radio', question: '另一方探视频率', required: true,
        options: [
          { value: '每周', label: '每周 1 次' },
          { value: '每两周', label: '每 2 周 1 次' },
          { value: '每月', label: '每月 1-2 次' },
          { value: '寒暑假集中', label: '寒暑假集中探视' },
        ],
      },
      { id: 'cc9', key: 'visitDetail', type: 'textarea', question: '探视具体安排 (时间/地点/接送)', required: false, placeholder: '如: 每周六 10:00-18:00, 父/母 A 负责接送' },
    ],
  },
  {
    id: 'cc-finance',
    title: '抚养费与教育',
    description: '钱从哪来, 怎么花',
    icon: '💵',
    questions: [
      { id: 'cc10', key: 'monthlySupport', type: 'number', question: '月抚养费总额 (元)', required: true, placeholder: '如: 3000' },
      {
        id: 'cc11', key: 'supportPayer', type: 'radio', question: '由谁支付', required: true,
        options: [
          { value: 'parentA', label: '父/母 A' },
          { value: 'parentB', label: '父/母 B' },
          { value: 'split', label: '共同分摊' },
        ],
      },
      { id: 'cc12', key: 'supportUntil', type: 'text', question: '支付至何时', required: false, placeholder: '如: 子女 18 周岁 / 大学本科毕业' },
      {
        id: 'cc13', key: 'medicalEducation', type: 'radio', question: '大额医疗/教育费用', required: true,
        options: [
          { value: '各半', label: '双方各半' },
          { value: '按收入比', label: '按收入比例' },
          { value: '实报实销', label: '凭发票实报实销' },
        ],
      },
    ],
  },
  {
    id: 'cc-special',
    title: '特殊安排',
    description: '医疗/教育决策 / 紧急联系',
    icon: '📞',
    questions: [
      {
        id: 'cc14', key: 'decisionMaker', type: 'radio', question: '重大医疗教育决策由谁做主?', required: true,
        options: [
          { value: 'joint', label: '双方协商一致' },
          { value: 'primaryParent', label: '主要抚养方单独决定' },
          { value: 'rotating', label: '按事项轮换' },
        ],
      },
      { id: 'cc15', key: 'emergencyContact', type: 'text', question: '紧急情况联系人电话', required: false },
    ],
  },
  {
    id: 'cc-review',
    title: '确认签署',
    description: '请确认信息',
    icon: '✍️',
    questions: [
      {
        id: 'cc15a', key: 'signingMethod', type: 'radio',
        question: '您计划如何完成签署?',
        required: true,
        options: [
          { value: '双方亲笔', label: '双方亲笔签名' },
          { value: '公证', label: '请公证机构公证 (推荐)' },
        ],
      },
      {
        id: 'cc15b', key: 'disputeResolution', type: 'radio',
        question: '若对本协议产生争议, 您希望通过哪种方式解决?',
        required: true,
        options: [
          { value: '诉讼', label: '向有管辖权的人民法院提起诉讼' },
          { value: '仲裁', label: '提交仲裁机构仲裁' },
        ],
      },
      {
        id: 'cc15c', key: 'courtJurisdiction', type: 'text', question: '约定管辖法院所在地 (选填)', required: false, placeholder: '如: 子女居住地人民法院' },
      {
        id: 'cc16', key: 'isVoluntary', type: 'radio', question: '本协议是双方自愿签订?', required: true,
        options: [
          { value: '是', label: '是' },
          { value: '否', label: '否' },
        ],
      },
      {
        id: 'cc17', key: 'confirmed', type: 'radio', question: '我声明以上信息真实有效', required: true,
        options: [
          { value: '我同意', label: '我同意' },
          { value: '我不同意', label: '我不同意' },
        ],
      },
    ],
  },
];

// ============================================================================
// 5. 赠与协议 (动产 / 不动产 / 股权 / 知识产权)
// ============================================================================
export const giftModules: Module[] = [
  ...PREFLIGHT_MODULES,
  {
    id: 'gf-parties',
    title: '当事人信息',
    description: '赠与人与受赠人',
    icon: '🎁',
    questions: [
      { id: 'gf1', key: 'donorName', type: 'text', question: '赠与人姓名', required: true },
      { id: 'gf2', key: 'donorIdCard', type: 'text', question: '赠与人身份证号 (18位)', required: true, placeholder: '请输入 18 位身份证号' },
      { id: 'gf3', key: 'recipientName', type: 'text', question: '受赠人姓名', required: true },
      { id: 'gf4', key: 'recipientIdCard', type: 'text', question: '受赠人身份证号 (18位)', required: true, placeholder: '请输入 18 位身份证号' },
      {
        id: 'gf5', key: 'relation', type: 'radio', question: '双方关系', required: true,
        options: [
          { value: '夫妻', label: '夫妻' },
          { value: '父母子女', label: '父母与子女' },
          { value: '兄弟姐妹', label: '兄弟姐妹' },
          { value: '其他亲属', label: '其他亲属' },
          { value: '朋友', label: '朋友' },
          { value: '其他', label: '其他' },
        ],
      },
    ],
  },
  {
    id: 'gf-asset',
    title: '赠与财产',
    description: '什么东西, 值多少',
    icon: '💎',
    questions: [
      {
        id: 'gf6', key: 'assetType', type: 'radio', question: '财产类型', required: true,
        options: [
          { value: '房产', label: '房产 (不动产)' },
          { value: '车辆', label: '车辆' },
          { value: '存款', label: '存款/现金' },
          { value: '股权', label: '公司股权' },
          { value: '知识产权', label: '知识产权 (专利/版权/商标)' },
          { value: '数字资产', label: '数字资产 (自媒体/网店/账号)' },
          { value: '动产', label: '其他动产' },
        ],
      },
      { id: 'gf7', key: 'assetDetail', type: 'textarea', question: '财产详情 (地址/账号/股权比例)', required: true, placeholder: '如: 北京市朝阳区XX路1201室, 房产证号 XXX' },
      { id: 'gf8', key: 'assetValue', type: 'text', question: '评估价值 (元)', required: false, placeholder: '如: 5000000' },
    ],
  },
  {
    id: 'gf-conditions',
    title: '条件与生效',
    description: '是否附加条件 / 公证',
    icon: '📜',
    questions: [
      {
        id: 'gf9', key: 'hasConditions', type: 'radio', question: '是否有附加条件', required: true,
        options: [
          { value: '无条件', label: '无条件赠与' },
          { value: '附条件', label: '附条件 (如赡养/抚养/学业)' },
        ],
      },
      { id: 'gf10', key: 'conditions', type: 'textarea', question: '附加条件具体内容', required: false, placeholder: '如: 受赠人需每年探望赠与人不少于 4 次' },
      {
        id: 'gf11', key: 'needNotarization', type: 'radio', question: '是否需要公证', required: true,
        options: [
          { value: '是', label: '是, 强烈建议 (尤其是不动产)' },
          { value: '否', label: '否, 双方签字即可' },
        ],
      },
      { id: 'gf12', key: 'effectiveDate', type: 'text', question: '生效日期', required: false, placeholder: '如: 2026-09-01' },
    ],
  },
  ASSETS_STRUCTURED_MODULE,
  {
    id: 'gf-review',
    title: '确认签署',
    description: '请确认信息',
    icon: '✍️',
    questions: [
      {
        id: 'gf12a', key: 'signingMethod', type: 'radio',
        question: '您计划如何完成签署?',
        required: true,
        options: [
          { value: '双方亲笔', label: '双方亲笔签名' },
          { value: '公证', label: '请公证机构公证 (不动产/大额必选)' },
        ],
      },
      {
        id: 'gf12b', key: 'disputeResolution', type: 'radio',
        question: '若对本协议产生争议, 您希望通过哪种方式解决?',
        required: true,
        options: [
          { value: '诉讼', label: '向有管辖权的人民法院提起诉讼' },
          { value: '仲裁', label: '提交仲裁机构仲裁' },
        ],
      },
      {
        id: 'gf12c', key: 'arbitrationInstitution', type: 'text', question: '若选仲裁, 仲裁机构名称 (选填)', required: false, placeholder: '如: 北京仲裁委员会' },
      {
        id: 'gf13', key: 'isVoluntary', type: 'radio', question: '赠与是否完全自愿, 无欺诈胁迫?', required: true,
        options: [
          { value: '是', label: '是' },
          { value: '否', label: '否' },
        ],
      },
      {
        id: 'gf14', key: 'confirmed', type: 'radio', question: '我声明以上信息真实有效, 委托系统化生成赠与协议草稿', required: true,
        options: [
          { value: '我同意', label: '我同意' },
          { value: '我不同意', label: '我不同意' },
        ],
      },
    ],
  },
];

// ============================================================================
// 统一调度器 — 路由 type 找 modules
// ============================================================================
export const NON_WILL_MODULES: Record<string, Module[]> = {
  marriage: marriageModules,
  'marital-property': maritalPropertyModules,
  divorce: divorceModules,
  'child-custody': childCustodyModules,
  gift: giftModules,
};

export function getModulesForType(type: string): Module[] | null {
  return NON_WILL_MODULES[type] || null;
}
