// 遗嘱问卷配置 - 7模块25题
export interface Question {
  id: string;
  module: string;
  moduleName: string;
  question: string;
  type: 'radio' | 'checkbox' | 'input' | 'number' | 'textarea';
  options?: string[];
  required: boolean;
  placeholder?: string;
  validate?: (value: any) => string | null;
}

export const modules = [
  { id: 'basic', name: '基本信息', icon: '👤' },
  { id: 'family', name: '家庭状况', icon: '👨‍👩‍👧' },
  { id: 'assets', name: '财产状况', icon: '🏠' },
  { id: 'heirs', name: '继承人', icon: '❤️' },
  { id: 'arrangements', name: '特殊安排', icon: '📋' },
  { id: 'medical', name: '医疗意愿', icon: '🏥' },
  { id: 'review', name: '确认签署', icon: '✍️' },
];

export const questions: Question[] = [
  // 模块1: 基本信息 (4题)
  {
    id: 'q1',
    module: 'basic',
    moduleName: '基本信息',
    question: '您的姓名',
    type: 'input',
    required: true,
    placeholder: '请输入真实姓名',
  },
  {
    id: 'q2',
    module: 'basic',
    moduleName: '基本信息',
    question: '您的年龄',
    type: 'number',
    required: true,
    placeholder: '请输入年龄',
  },
  {
    id: 'q3',
    module: 'basic',
    moduleName: '基本信息',
    question: '您的身份证号（仅用于公证）',
    type: 'input',
    required: false,
    placeholder: '可选填，确保真实性',
  },
  {
    id: 'q4',
    module: 'basic',
    moduleName: '基本信息',
    question: '您的联系电话',
    type: 'input',
    required: true,
    placeholder: '用于接收律师联系',
  },

  // 模块2: 家庭状况 (4题)
  {
    id: 'q5',
    module: 'family',
    moduleName: '家庭状况',
    question: '您的婚姻状况',
    type: 'radio',
    required: true,
    options: ['未婚', '已婚', '离异', '丧偶'],
  },
  {
    id: 'q6',
    module: 'family',
    moduleName: '家庭状况',
    question: '您是否有未成年的子女？',
    type: 'radio',
    required: true,
    options: ['是', '否'],
  },
  {
    id: 'q7',
    module: 'family',
    moduleName: '家庭状况',
    question: '您的子女情况（选择或填写）',
    type: 'textarea',
    required: false,
    placeholder: '例如：长子张大明35岁，次女张小红30岁',
  },
  {
    id: 'q8',
    module: 'family',
    moduleName: '家庭状况',
    question: '是否有其他需要您抚养的家人？',
    type: 'radio',
    required: true,
    options: ['无', '有父母需要赡养', '有其他亲属需要抚养'],
  },

  // 模块3: 财产状况 (4题)
  {
    id: 'q9',
    module: 'assets',
    moduleName: '财产状况',
    question: '您的主要财产类型',
    type: 'checkbox',
    required: true,
    options: ['房产', '银行存款', '股票基金', '保险', '车辆', '企业股权', '其他'],
  },
  {
    id: 'q10',
    module: 'assets',
    moduleName: '财产状况',
    question: '房产情况',
    type: 'textarea',
    required: false,
    placeholder: '例如：北京市朝阳区某小区商品房一套，估值约500万',
  },
  {
    id: 'q11',
    module: 'assets',
    moduleName: '财产状况',
    question: '其他财产总估值（万元）',
    type: 'number',
    required: false,
    placeholder: '包括存款、股票、基金等',
  },
  {
    id: 'q12',
    module: 'assets',
    moduleName: '财产状况',
    question: '您是否有负债？',
    type: 'radio',
    required: true,
    options: ['无', '有房贷', '有其他负债'],
  },

  // 模块4: 继承人 (4题)
  {
    id: 'q13',
    module: 'heirs',
    moduleName: '继承人',
    question: '您想指定谁为继承人？',
    type: 'textarea',
    required: true,
    placeholder: '请列出继承人姓名及与您的关系',
  },
  {
    id: 'q14',
    module: 'heirs',
    moduleName: '继承人',
    question: '财产分配方式',
    type: 'radio',
    required: true,
    options: ['均等分配', '按比例分配', '指定具体财产', '暂不明确'],
  },
  {
    id: 'q15',
    module: 'heirs',
    moduleName: '继承人',
    question: '是否有继承人不希望继承？',
    type: 'radio',
    required: false,
    options: ['是', '否'],
  },
  {
    id: 'q16',
    module: 'heirs',
    moduleName: '继承人',
    question: '是否有需要特别照顾的继承人？',
    type: 'radio',
    required: false,
    options: ['无', '未成年子女', '残疾人', '老年人'],
  },

  // 模块5: 特殊安排 (3题)
  {
    id: 'q17',
    module: 'arrangements',
    moduleName: '特殊安排',
    question: '是否需要指定监护人？',
    type: 'radio',
    required: false,
    options: ['不需要', '指定监护人'],
  },
  {
    id: 'q18',
    module: 'arrangements',
    moduleName: '特殊安排',
    question: '是否有宠物需要安排？',
    type: 'radio',
    required: false,
    options: ['无', '有'],
  },
  {
    id: 'q19',
    module: 'arrangements',
    moduleName: '特殊安排',
    question: '数字遗产安排（账号、密码等）',
    type: 'textarea',
    required: false,
    placeholder: '例如：微信、支付宝、邮箱等账号处理方式',
  },

  // 模块6: 医疗意愿 (3题)
  {
    id: 'q20',
    module: 'medical',
    moduleName: '医疗意愿',
    question: '如遇危急情况，是否希望全力抢救？',
    type: 'radio',
    required: true,
    options: ['是，尽一切可能', '否，在某些情况下放弃', '由家属决定'],
  },
  {
    id: 'q21',
    module: 'medical',
    moduleName: '医疗意愿',
    question: '是否有人口器官捐献意愿？',
    type: 'radio',
    required: false,
    options: ['无', '愿意捐献全部', '愿意捐献部分'],
  },
  {
    id: 'q22',
    module: 'medical',
    moduleName: '医疗意愿',
    question: '身后事安排意愿',
    type: 'radio',
    required: false,
    options: ['一切从简', '传统殡葬', '海葬/树葬等环保葬', '尚未考虑'],
  },

  // 模块7: 确认签署 (3题)
  {
    id: 'q23',
    module: 'review',
    moduleName: '确认签署',
    question: '是否立有遗嘱？',
    type: 'radio',
    required: true,
    options: ['从未立过', '之前有但已过时', '想更新现有遗嘱'],
  },
  {
    id: 'q24',
    module: 'review',
    moduleName: '确认签署',
    question: '是否了解遗嘱需要公证才完全具备法律效力？',
    type: 'radio',
    required: true,
    options: ['了解', '不了解，需要说明'],
  },
  {
    id: 'q25',
    module: 'review',
    moduleName: '确认签署',
    question: '我声明以上信息真实有效，并委托AI辅助生成遗嘱草稿',
    type: 'radio',
    required: true,
    options: ['我同意', '我不同意'],
  },
];

export function getQuestionsByModule(moduleId: string): Question[] {
  return questions.filter(q => q.module === moduleId);
}

export function getModuleProgress(moduleId: string): { current: number; total: number } {
  const moduleQuestions = getQuestionsByModule(moduleId);
  return { current: moduleQuestions.length, total: moduleQuestions.length };
}

export function getTotalQuestions(): number {
  return questions.length;
}

export function getModuleIndex(moduleId: string): number {
  return modules.findIndex(m => m.id === moduleId);
}
