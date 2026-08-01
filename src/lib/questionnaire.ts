// 遗嘱问卷配置 - 7模块25题
// 每个module含questions数组，question.key对用formData字段，options为{value,label}对象数组

export interface QuestionOption {
  value: string;
  label: string;
}

export interface Question {
  id: string;
  key: string;           // 对应 formData 字段名
  type: 'radio' | 'text' | 'number' | 'textarea' | 'checkbox';
  question: string;      // 问题文字
  options?: QuestionOption[];  // radio/checkbox 的选项
  placeholder?: string;
  hint?: string;         // 可选的提示文字
  required: boolean;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  icon: string;
  questions: Question[];
}

export const modules: Module[] = [
  // === 前置步骤 (合规闸门) ===
  // 模块 P1: 立场确认 — 区分代填 / 协商一致
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
  // 模块 P2: 行为能力 + 自愿性声明 (合并以减少步骤)
  {
    id: 'preflight-declare',
    title: '行为能力与自愿声明',
    description: '依据《民法典》§143, §150-151',
    icon: '✅',
    questions: [
      {
        id: 'pf2', key: 'hasFullCapacity', type: 'radio',
        question: '本人为完全民事行为能力人, 填写时意识清醒, 无受胁迫/欺诈情况',
        hint: '若您为限制民事行为能力者 (如精神障碍、认知障碍老人), 须通过法定代理人操作, 直接填写生成的文书无效',
        required: true,
        options: [
          { value: '是', label: '是, 我具备完全民事行为能力, 意识清醒, 自愿填写' },
          { value: '否', label: '否, 或存在不确定' },
        ],
      },
    ],
  },
  // 模块 P3: 冲突检测 — 是否已有相关文书
  {
    id: 'preflight-conflict',
    title: '冲突检测',
    description: '依据《民法典》§1142 (遗嘱以最后一份为准)',
    icon: '🔍',
    questions: [
      {
        id: 'pf3', key: 'hasPriorDoc', type: 'radio',
        question: '您此前是否已立过相关文书 (遗嘱/婚前协议/婚内协议等)?',
        hint: '有则新文书应明确声明撤销/变更前文书对应条款, 否则可能条款冲突导致部分无效',
        required: true,
        options: [
          { value: '无', label: '无, 此前未立过任何相关文书' },
          { value: '有同类型', label: '有同类型文书 (如旧版遗嘱/婚前协议)' },
          { value: '有其他类型', label: '有其他类型相关文书' },
        ],
      },
      {
        id: 'pf3b', key: 'priorDocDetail', type: 'textarea',
        question: '请描述已有文书的类型与签订时间',
        required: false,
        placeholder: '如: 2018年签订婚前财产协议; 2020年立自书遗嘱一份 (存放于XX处)',
      },
    ],
  },
  // 模块0: 主体资格确认 (民法典第143条 - 行为能力)
  // 模块1: 基本信息
  {
    id: 'basic',
    title: '基本信息',
    description: '请填写您的基本信息',
    icon: '👤',
    questions: [
      {
        id: 'q1',
        key: 'name',
        type: 'text',
        question: '您的姓名',
        required: true,
        placeholder: '请输入真实姓名',
      },
      {
        id: 'q2',
        key: 'age',
        type: 'number',
        question: '您的年龄',
        required: true,
        placeholder: '请输入年龄',
      },
      {
        id: 'q3',
        key: 'idCard',
        type: 'text',
        question: '您的身份证号 (18位)',
        hint: '依据《民法典》第469条, 法院/公证处核验文书时需核对姓名与身份证号一致性',
        required: true,
        placeholder: '请输入 18 位身份证号, 仅用于文书生成',
      },
      {
        id: 'q4',
        key: 'phone',
        type: 'text',
        question: '您的联系电话',
        required: true,
        placeholder: '用于接收专业资产规划人员回访',
      },
    ],
  },
  // 模块2: 家庭状况
  {
    id: 'family',
    title: '家庭状况',
    description: '请填写您的家庭状况',
    icon: '👨‍👩‍👧',
    questions: [
      {
        id: 'q5',
        key: 'maritalStatus',
        type: 'radio',
        question: '您的婚姻状况',
        required: true,
        options: [
          { value: '未婚', label: '未婚' },
          { value: '已婚', label: '已婚' },
          { value: '离异', label: '离异' },
          { value: '丧偶', label: '丧偶' },
        ],
      },
      {
        id: 'q6',
        key: 'hasMinorChildren',
        type: 'radio',
        question: '您是否有未成年的子女？',
        required: true,
        options: [
          { value: '是', label: '是' },
          { value: '否', label: '否' },
        ],
      },
      {
        id: 'q7',
        key: 'children',
        type: 'textarea',
        question: '您的子女情况（选择或填写）',
        required: false,
        placeholder: '例如：长子张大明35岁，次女张小红30岁',
      },
      {
        id: 'q8',
        key: 'hasDependents',
        type: 'radio',
        question: '是否有其他需要您抚养的家人？',
        required: true,
        options: [
          { value: '无', label: '无' },
          { value: '有父母需要赡养', label: '有父母需要赡养' },
          { value: '有其他亲属需要抚养', label: '有其他亲属需要抚养' },
        ],
      },
    ],
  },
  // 模块3: 财产状况
  {
    id: 'assets',
    title: '财产状况',
    description: '请填写您的财产情况',
    icon: '🏠',
    questions: [
      {
        id: 'q9',
        key: 'assetTypes',
        type: 'checkbox',
        question: '您的主要财产类型 (可多选)',
        hint: '依据《民法典》第1062条, 知识产权、数字资产、人寿保险等均属重要财产',
        required: true,
        options: [
          { value: '房产', label: '房产' },
          { value: '银行存款', label: '银行存款' },
          { value: '股票基金', label: '股票/基金' },
          { value: '车辆', label: '车辆' },
          { value: '企业股权', label: '企业股权' },
          { value: '知识产权', label: '知识产权 (专利/版权/商标)' },
          { value: '数字资产', label: '数字资产 (自媒体/网店/加密货币/游戏账号)' },
          { value: '人寿保险', label: '人寿保险 (保单现金价值)' },
          { value: '其他', label: '其他' },
        ],
      },
      {
        id: 'q9b',
        key: 'ipAssetDetail',
        type: 'textarea',
        question: '知识产权与数字资产详情',
        hint: '如: 某专利号XXX/某商标注册号XXX/某公众号粉丝XX万/某网店年度营收XX万',
        required: false,
        placeholder: '选填, 列出知识产权登记号、数字资产账号、估值及归属约定',
      },
      {
        id: 'q9c',
        key: 'insuranceDetail',
        type: 'textarea',
        question: '人寿保险详情',
        hint: '保险受益人是否需调整? 默认受益人 vs 指定受益人将影响理赔结果',
        required: false,
        placeholder: '选填, 列出保单号/保险公司/当前受益人/是否调整',
      },
      {
        id: 'q10',
        key: 'propertyDesc',
        type: 'textarea',
        question: '房产情况',
        required: false,
        placeholder: '例如：北京市朝阳区某小区商品房一套，估值约500万',
      },
      {
        id: 'q11',
        key: 'otherAssetsValue',
        type: 'number',
        question: '其他财产总估值（万元）',
        required: false,
        placeholder: '包括存款、股票、基金等',
      },
    ],
  },
  // 模块3.2: 财产明细 (结构化填写 — 产权证号/账号/受益人等关键字段不遗漏)
  {
    id: 'assets-structured',
    title: '财产明细 (结构化)',
    description: '为确保文书精度, 请逐项补充关键字段 (产权证号/账号/受益人等)',
    icon: '📋',
    questions: [
      {
        id: 'as1', key: 'hasRealEstate', type: 'radio',
        question: '您是否有房产需要列入?',
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
        question: '您是否有车辆需要列入?',
        required: true,
        options: [
          { value: '无', label: '无' },
          { value: '有', label: '有 (需填写车牌/行驶证)' },
        ],
      },
      {
        id: 'as2b', key: 'vehicleDetail', type: 'textarea',
        question: '车辆明细 (车牌号 / 车型 / 车架号 / 登记证书号)',
        required: false,
        placeholder: '如: 京A·XXXXX; 丰田凯美瑞2023款; 车架号LHGCM1...; 登记证书号XXX',
      },
      {
        id: 'as3', key: 'hasBankAccount', type: 'radio',
        question: '您是否有银行账户/存款需要列入?',
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
        question: '您是否持有公司股权/股票基金?',
        required: true,
        options: [
          { value: '无', label: '无' },
          { value: '有', label: '有 (需填写公司名/股票代码/持股比例)' },
        ],
      },
      {
        id: 'as4b', key: 'equityDetail', type: 'textarea',
        question: '股权/股票基金明细 (公司名 / 股票代码 / 持股比例 / 数量)',
        required: false,
        placeholder: '如: XX科技有限公司, 持股30%; 或 平安银行(000001), 持股10000股',
      },
      {
        id: 'as5', key: 'hasInsurance', type: 'radio',
        question: '您是否拥有人寿保险?',
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
        question: '您是否持有数字资产 (加密货币/网络店铺/重要自媒体账号)?',
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
        placeholder: '如: 公众号"家有所爱"(ID: gh_xxxxx); BTC钱包 0x...; 淘宝店铺"XXX小店"',
      },
    ],
  },
  // 模块3.5: 债务与担保 (民法典第1064-1065条 - 共同债务)
  {
    id: 'debt',
    title: '债务与担保',
    description: '依据《民法典》第1064-1065条, 债务约定缺失将影响第三方追偿',
    icon: '💳',
    questions: [
      {
        id: 'q12a',
        key: 'hasPersonalLoan',
        type: 'radio',
        question: '您是否有个人贷款/欠款?',
        required: true,
        options: [
          { value: '无', label: '无' },
          { value: '有', label: '有 (信用卡/消费贷/民间借贷等)' },
        ],
      },
      {
        id: 'q12b',
        key: 'hasJointLoan',
        type: 'radio',
        question: '您是否有夫妻/家庭共同贷款?',
        hint: '如房贷、车贷、共同经营贷款等, 离婚/继承时需明确承担方',
        required: true,
        options: [
          { value: '无', label: '无' },
          { value: '有', label: '有 (需注明金额/银行/余额)' },
        ],
      },
      {
        id: 'q12c',
        key: 'isGuarantor',
        type: 'radio',
        question: '您是否为他人提供担保?',
        hint: '担保责任将影响您名下财产, 配偶/继承人有知情权',
        required: true,
        options: [
          { value: '否', label: '否' },
          { value: '是', label: '是 (需注明被担保人/金额/担保类型)' },
        ],
      },
      {
        id: 'q12d',
        key: 'debtDetail',
        type: 'textarea',
        question: '债务清单与承担约定',
        required: false,
        placeholder: '如: 房贷XX万 (余额XX万) 由XXX承担; 担保XX万为XXX向XX银行借款',
      },
    ],
  },
  // 模块4: 继承人
  {
    id: 'heirs',
    title: '继承人',
    description: '请指定您的继承人',
    icon: '❤️',
    questions: [
      {
        id: 'q13',
        key: 'heirs',
        type: 'textarea',
        question: '您想指定谁为继承人？',
        required: true,
        placeholder: '请列出继承人姓名及与您的关系',
      },
      {
        id: 'q14',
        key: 'distributionMethod',
        type: 'radio',
        question: '财产分配方式',
        required: true,
        options: [
          { value: '均等分配', label: '均等分配' },
          { value: '按比例分配', label: '按比例分配' },
          { value: '指定具体财产', label: '指定具体财产' },
          { value: '暂不明确', label: '暂不明确' },
        ],
      },
      {
        id: 'q15',
        key: 'excludeHeir',
        type: 'radio',
        question: '是否有继承人不希望继承？',
        required: false,
        options: [
          { value: '是', label: '是' },
          { value: '否', label: '否' },
        ],
      },
      {
        id: 'q16',
        key: 'vulnerableHeir',
        type: 'radio',
        question: '是否有需要特别照顾的继承人？',
        required: false,
        options: [
          { value: '无', label: '无' },
          { value: '未成年子女', label: '未成年子女' },
          { value: '残疾人', label: '残疾人' },
          { value: '老年人', label: '老年人' },
        ],
      },
    ],
  },
  // 模块5: 特殊安排
  {
    id: 'arrangements',
    title: '特殊安排',
    description: '是否有特殊安排需求',
    icon: '📋',
    questions: [
      {
        id: 'q17',
        key: 'needGuardian',
        type: 'radio',
        question: '是否需要指定监护人？',
        required: false,
        options: [
          { value: '不需要', label: '不需要' },
          { value: '指定监护人', label: '指定监护人' },
        ],
      },
      {
        id: 'q18',
        key: 'hasPet',
        type: 'radio',
        question: '是否有宠物需要安排？',
        required: false,
        options: [
          { value: '无', label: '无' },
          { value: '有', label: '有' },
        ],
      },
      {
        id: 'q19',
        key: 'digitalHeritage',
        type: 'textarea',
        question: '数字遗产安排（账号、密码等）',
        required: false,
        placeholder: '例如：微信、支付宝、邮箱等账号处理方式',
      },
    ],
  },
  // 模块6: 医疗意愿
  {
    id: 'medical',
    title: '医疗意愿',
    description: '请选择您的医疗意愿',
    icon: '🏥',
    questions: [
      {
        id: 'q20',
        key: 'lifeSupport',
        type: 'radio',
        question: '如遇危急情况，是否希望全力抢救？',
        required: true,
        options: [
          { value: '是，尽一切可能', label: '是，尽一切可能' },
          { value: '否，在某些情况下放弃', label: '否，在某些情况下放弃' },
          { value: '由家属决定', label: '由家属决定' },
        ],
      },
      {
        id: 'q21',
        key: 'organDonation',
        type: 'radio',
        question: '是否有人口器官捐献意愿？',
        required: false,
        options: [
          { value: '无', label: '无' },
          { value: '愿意捐献全部', label: '愿意捐献全部' },
          { value: '愿意捐献部分', label: '愿意捐献部分' },
        ],
      },
      {
        id: 'q22',
        key: 'funeralArrangement',
        type: 'radio',
        question: '身后事安排意愿',
        required: false,
        options: [
          { value: '一切从简', label: '一切从简' },
          { value: '传统殡葬', label: '传统殡葬' },
          { value: '海葬/树葬等环保葬', label: '海葬/树葬等环保葬' },
          { value: '尚未考虑', label: '尚未考虑' },
        ],
      },
    ],
  },
  // 模块7: 确认签署
  {
    id: 'review',
    title: '确认签署',
    description: '请确认以下信息',
    icon: '✍️',
    questions: [
      {
        id: 'q23',
        key: 'existingWill',
        type: 'radio',
        question: '是否立有遗嘱？',
        required: true,
        options: [
          { value: '从未立过', label: '从未立过' },
          { value: '之前有但已过时', label: '之前有但已过时' },
          { value: '想更新现有遗嘱', label: '想更新现有遗嘱' },
        ],
      },
      {
        id: 'q24a',
        key: 'signingMethod',
        type: 'radio',
        question: '您计划如何完成签署?',
        hint: '依据《民法典》第1134-1136条, 不同形式遗嘱有不同生效要件',
        required: true,
        options: [
          { value: '自书', label: '自书遗嘱 (亲笔书写全文+签名+日期)' },
          { value: '公证', label: '公证遗嘱 (推荐, 尤其大额资产)' },
          { value: '见证', label: '见证遗嘱 (需 2 名见证人在场, 打印件每页签名)' },
          { value: '录音录像', label: '录音录像遗嘱 (需 2 名见证人在场)' },
        ],
      },
      {
        id: 'q24b',
        key: 'disputeResolution',
        type: 'radio',
        question: '若对本遗嘱产生争议, 您希望通过哪种方式解决?',
        hint: '依据《民法典》第469条, 文书应明确争议解决条款',
        required: true,
        options: [
          { value: '诉讼', label: '向有管辖权的人民法院提起诉讼' },
          { value: '仲裁', label: '提交仲裁机构仲裁' },
        ],
      },
      {
        id: 'q24c',
        key: 'courtJurisdiction',
        type: 'text',
        question: '约定管辖法院所在地 (选填, 默认被告住所地)',
        required: false,
        placeholder: '如: 北京市朝阳区人民法院',
      },
      {
        id: 'q25',
        key: 'understandNotarization',
        type: 'radio',
        question: '是否了解遗嘱需要公证才完全具备法律效力？',
        required: true,
        options: [
          { value: '了解', label: '了解' },
          { value: '不了解，需要说明', label: '不了解，需要说明' },
        ],
      },
      {
        id: 'q26',
        key: 'confirmed',
        type: 'radio',
        question: '我声明以上信息真实有效，并委托系统化生成遗嘱草稿',
        required: true,
        options: [
          { value: '我同意', label: '我同意' },
          { value: '我不同意', label: '我不同意' },
        ],
      },
    ],
  },
];

export function getModuleById(id: string): Module | undefined {
  return modules.find((m) => m.id === id);
}

export function getTotalQuestions(): number {
  return modules.reduce((sum, m) => sum + m.questions.length, 0);
}
