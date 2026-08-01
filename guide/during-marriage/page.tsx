import type { Metadata } from 'next';
import Link from 'next/link';
import { GuideArticle } from '@/components/GuideArticle';

export const metadata: Metadata = {
  title: '婚内财产协议怎么写 - 完整指南 2026',
  description: '婚内财产协议完整指南: 房产 / 存款 / 股权归属约定, 与离婚协议的区别, 公证流程, 模板下载. 感情稳固的定心丸, ¥19.9 系统化生成.',
  keywords: ['婚内财产协议', '婚内财产约定', '夫妻财产协议', '婚后财产约定', '房产归属', '股权归属', '婚姻协议'],
  openGraph: {
    title: '婚内财产协议怎么写 - 2026 完整指南 | 家有所爱',
    description: '已婚中产家庭财产规划必备: 房产 / 存款 / 股权归属约定, 适用情形 + 必备条款 + 公证流程.',
    url: 'https://aiwill-planner.cn/guide/during-marriage',
    siteName: '家有所爱',
    locale: 'zh_CN',
    type: 'article',
  },
  alternates: {
    canonical: 'https://aiwill-planner.cn/guide/during-marriage',
    languages: {
      'zh-CN': 'https://aiwill-planner.cn/guide/during-marriage',
      'zh-HK': 'https://aiwill-planner.cn/guide/during-marriage',
      'x-default': 'https://aiwill-planner.cn/guide/during-marriage',
    },
  },
};

export default function DuringMarriageGuide() {
  return (
    <GuideArticle
      title="婚内财产协议: 完整指南"
      subtitle="婚内财产协议是已婚夫妻对婚后财产归属的书面约定, 是感情稳固的「定心丸」, 不是感情破裂的信号."
      background="from-amber-50 via-white to-amber-50"
      breadcrumbs={[
        { name: '首页', url: '/' },
        { name: '幸福指南', url: '/guide/pre-marriage' },
        { name: '婚内财产' },
      ]}
      ctaDocType="marital-property"
      ctaTitle="10 分钟生成您的婚内财产协议"
      ctaDescription="覆盖房产 / 存款 / 股权 / 投资收益, 系统化问卷, ¥19.9 起."
      faqs={[
        {
          q: '婚内财产协议与婚前协议有什么区别?',
          a: '婚内协议是结婚后签订的, 调整婚后所得及部分婚前财产的归属; 婚前协议是结婚前签订的, 同样有效力. 两者法律依据相同 (民法典1065条), 但适用场景不同: 婚前协议为婚姻奠基, 婚内协议为婚姻稳固.',
        },
        {
          q: '婚姻存续期间签订的财产协议有效吗?',
          a: '有效. 民法典明确夫妻在婚姻存续期间可以就财产归属作出书面约定. 签订后对双方具有法律约束力. 建议办理公证或在不动产登记中心备案, 增强证明效力.',
        },
        {
          q: '婚内协议能否约定父母赠与归一方所有?',
          a: '可以且强烈建议. 父母婚后赠与若未明确, 默认视为夫妻共同财产. 婚内协议可约定: 「父母赠与本方子女的财产 (含房产、现金、车辆等), 属于受赠子女个人财产, 不属于夫妻共同财产」, 从根本上避免日后纠纷.',
        },
        {
          q: '婚内协议对未成年子女也有效吗?',
          a: '协议对未成年子女的抚养义务约定无效. 民法典规定父母对未成年子女有法定的抚养义务, 不能通过协议排除. 但协议可就抚养费数额、支付方式、子女教育规划等事项作出详细安排.',
        },
        {
          q: '婚内协议签订后可以撤销或变更吗?',
          a: '可以, 但需双方协商一致, 采取书面形式. 单方撤销或口头修改无效. 重大财产变化 (如新增房产、股权结构变动) 时建议重新签订或签订补充协议, 必要时再次公证.',
        },
        {
          q: '现实生活中, 真正签订婚内协议的夫妻比例有多高?',
          a: '比例较低, 国内尚无权威统计, 但参考西方国家数据: 美国约5-10%的已婚夫妇签婚前/婚内协议; 国内一线城市中产家庭近年签署比例逐年上升, 高净值人群更为普及. 协议本质是风险预防, 与感情好坏无关.',
        },
      ]}
    >
      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          一、什么是婚内财产协议?
        </h2>
        <p>
          婚内财产协议, 也称「夫妻财产约定」「婚内财产协议」, 是指夫妻在婚姻关系存续期间,
          对婚后所得财产 (及部分婚前财产) 的归属, 管理, 处分等事项作出的书面约定.
        </p>
        <p>
          法律依据: 《民法典》第一千零六十五条. 约定对双方具有法律约束力.
        </p>
        <p className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm leading-relaxed-cn mt-3">
          <strong>💡 关键区别</strong>: 婚前协议是结婚前签订, 婚内协议是结婚后签订.
          两者保障效果相同, 但适用场景不同.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          二、什么情况下建议签?
        </h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>一方收入较高, 财产快速增长</strong>: 如创业者, 高管, 网红, 投资者</li>
          <li><strong>婚前未做财产约定, 现在想补签</strong>: 婚姻持续多年, 想明确财产边界</li>
          <li><strong>父母赠与 / 继承财产</strong>: 父母出资买房 / 赠与现金, 想明确只赠与自己子女</li>
          <li><strong>公司经营需要</strong>: 涉及股权架构, 合伙人利益, 防止离婚影响企业经营</li>
          <li><strong>再婚家庭</strong>: 与前任有子女, 想保护现任家庭财产不被分割</li>
          <li><strong>规避债务风险</strong>: 一方经营企业有负债风险, 另一方想隔离</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          三、必备条款
        </h2>
        <ol className="list-decimal pl-6 space-y-3">
          <li>
            <strong>房产归属</strong>: 已购房产的具体归属 (各自 / 共同 / 按份),
            未来购置房产的首付出资比例与归属, 房贷偿还责任.
          </li>
          <li>
            <strong>存款与投资</strong>: 工资收入, 投资收益, 理财产品等婚后所得的归属.
            是否设立共同账户, 共同账户的使用规则.
          </li>
          <li>
            <strong>股权 / 合伙份额</strong>: 一方持有的公司股权, 合伙份额, 是否属于夫妻共同财产.
            增值部分的归属.
          </li>
          <li>
            <strong>父母赠与与继承</strong>: 父母赠与现金 / 房产的归属 (明确「只赠与自己子女」).
          </li>
          <li>
            <strong>个人债务与共同债务</strong>: 一方经营 / 投资产生的债务, 另一方是否承担连带责任.
          </li>
          <li>
            <strong>日常生活开支</strong>: 房贷, 子女教育, 医疗, 旅行等费用的分摊.
          </li>
          <li>
            <strong>违约责任与争议解决</strong>: 一方违反协议的法律后果, 诉讼管辖地.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          四、婚内协议 vs 离婚协议
        </h2>
        <p>两者常被混淆, 但法律性质完全不同:</p>
        <div className="overflow-x-auto my-3">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="text-left p-2 border border-slate-200">维度</th>
                <th className="text-left p-2 border border-slate-200">婚内财产协议</th>
                <th className="text-left p-2 border border-slate-200">离婚协议</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border border-slate-200 font-medium">签订时机</td>
                <td className="p-2 border border-slate-200">婚姻存续期间</td>
                <td className="p-2 border border-slate-200">协议离婚时</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-200 font-medium">婚姻状态</td>
                <td className="p-2 border border-slate-200">婚姻存续</td>
                <td className="p-2 border border-slate-200">婚姻即将解除</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-200 font-medium">财产范围</td>
                <td className="p-2 border border-slate-200">可约定婚后 + 部分婚前</td>
                <td className="p-2 border border-slate-200">全面分割夫妻共同财产</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-200 font-medium">法律性质</td>
                <td className="p-2 border border-slate-200">财产权益约定</td>
                <td className="p-2 border border-slate-200">解除婚姻 + 财产分割</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-200 font-medium">是否需要公证</td>
                <td className="p-2 border border-slate-200">建议公证</td>
                <td className="p-2 border border-slate-200">需民政局备案</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          五、5 个常见误区
        </h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>
            <strong>「签了就是准备离婚」</strong>: 完全相反, 婚内协议是婚姻稳固的体现, 提前消除财产隐患.
          </li>
          <li>
            <strong>「一方不签就无效」</strong>: 协议需双方自愿, 但只要协商一致即可, 不存在「一方强制」.
          </li>
          <li>
            <strong>「婚后收入当然一人一半」</strong>: 默认是共同财产, 但协议可约定为各自所有, 关键是书面 + 公证.
          </li>
          <li>
            <strong>「口头改了就生效」</strong>: 变更或解除需重新书面约定, 口头约定无效.
          </li>
          <li>
            <strong>「对子女也有效」</strong>: 协议不能排除对未成年子女的抚养义务, 该约定无效.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          六、价格 / 服务选择
        </h2>
        <p>
          婚内财产协议价格区间广. 选择服务时关注:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>是否覆盖房产, 股权, 投资等高频财产类型</li>
          <li>是否有专业人士 1 对 1 审核 (避免条款无效)</li>
          <li>是否提供后续修订服务 (资产变化时)</li>
        </ul>
        <p className="mt-3">
          <Link href="/doc-type?type=marital-property" className="text-amber-700 hover:text-amber-800 underline font-medium">
            家有所爱婚内财产协议
          </Link>
          {' '}: ¥19.9 系统化生成, ¥999 专家版含资产规划专业人士 1 对 1 视频审核.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          七、相关文书
        </h2>
        <ul className="list-disc pl-6 space-y-1">
          <li><Link href="/guide/pre-marriage" className="text-amber-700 hover:underline">婚前财产协议</Link></li>
          <li><Link href="/guide/divorce" className="text-amber-700 hover:underline">离婚协议书</Link></li>
          <li><Link href="/guide/gift" className="text-amber-700 hover:underline">赠与协议</Link></li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          八、写作教程索引
        </h2>
        <p>
          想了解这类文书的完整写作规范、模板示例和签字要求？
          {' '}
          <Link href="/tutorial" className="text-amber-700 hover:underline font-medium">
            查看家庭文书写作教程 →
          </Link>
        </p>
      </section>
    </GuideArticle>
  );
}
