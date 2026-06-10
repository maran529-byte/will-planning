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
        question: '您的身份证号（仅用于公证）',
        required: false,
        placeholder: '可选填，确保真实性',
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
        question: '您的主要财产类型',
        required: true,
        options: [
          { value: '房产', label: '房产' },
          { value: '银行存款', label: '银行存款' },
          { value: '股票基金', label: '股票基金' },
          { value: '保险', label: '保险' },
          { value: '车辆', label: '车辆' },
          { value: '企业股权', label: '企业股权' },
          { value: '其他', label: '其他' },
        ],
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
      {
        id: 'q12',
        key: 'hasDebt',
        type: 'radio',
        question: '您是否有负债？',
        required: true,
        options: [
          { value: '无', label: '无' },
          { value: '有房贷', label: '有房贷' },
          { value: '有其他负债', label: '有其他负债' },
        ],
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
        id: 'q24',
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
        id: 'q25',
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
