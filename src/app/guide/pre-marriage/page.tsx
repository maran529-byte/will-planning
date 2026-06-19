import type { Metadata } from 'next';
import Link from 'next/link';
import { GuideArticle } from '@/components/GuideArticle';

export const metadata: Metadata = {
  title: '婚前财产协议怎么写 - 完整指南 2026',
  description: '婚前财产协议完整指南: 什么情况下需要写, 写什么内容, 公证流程, 模板下载. 婚前 / 再婚财产清晰化必备, ¥19.9 系统化生成.',
  keywords: ['婚前财产协议', '婚前协议', '婚前财产公证', '婚前协议模板', '婚姻协议书', '婚前财产约定', '再婚财产', '彩礼'],
  openGraph: {
    title: '婚前财产协议怎么写 - 2026 完整指南 | 家有所爱',
    description: '婚前 / 再婚财产清晰化的法律工具: 适用情形 + 必备条款 + 公证流程 + 模板下载. 让婚姻从一开始就建立在坦诚之上.',
    url: 'https://aiwill-planner.cn/guide/pre-marriage',
    siteName: '家有所爱',
    locale: 'zh_CN',
    type: 'article',
  },
  alternates: {
    canonical: 'https://aiwill-planner.cn/guide/pre-marriage',
  },
};

export default function PreMarriageGuide() {
  return (
    <GuideArticle
      title="婚前财产协议: 完整指南"
      subtitle="婚前 / 再婚财产清晰化, 让婚姻从一开始就建立在坦诚之上. 本文覆盖适用情形, 必备条款, 公证流程, 常见误区."
      background="from-rose-50 via-white to-amber-50"
      breadcrumbs={[
        { name: '首页', url: '/' },
        { name: '幸福指南', url: '/guide/pre-marriage' },
        { name: '婚前财产' },
      ]}
      ctaDocType="marriage"
      ctaTitle="10 分钟生成您的婚前 / 婚姻协议书"
      ctaDescription="系统化问卷, 智能生成符合《民法典》的婚前财产协议, ¥19.9 起."
    >
      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          一、什么是婚前财产协议?
        </h2>
        <p>
          婚前财产协议, 也称「婚前财产约定」「婚姻协议书」, 是指男女双方在办理结婚登记前,
          对各自婚前财产及婚后所得财产的归属, 管理, 处分, 收益分配等事项作出的书面约定.
        </p>
        <p>
          根据《中华人民共和国民法典》第一千零六十五条规定: <strong>男女双方可以约定婚姻关系存续期间所得的财产以及婚前财产归各自所有, 共同所有或部分各自所有, 部分共同所有</strong>.
          约定应当采用书面形式. 没有约定或约定不明确的, 适用民法典关于夫妻财产的法定规定.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          二、什么情况下建议写?
        </h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>一方或双方婚前财产较多</strong>: 如房产, 车辆, 公司股权, 大额存款, 投资性资产</li>
          <li><strong>再婚家庭</strong>: 涉及与前任的子女, 父母赡养, 财产继承等复杂关系</li>
          <li><strong>一方父母有资助计划</strong>: 如父母准备为子女婚后买房, 明确赠与对象避免日后纠纷</li>
          <li><strong>双方收入差距较大</strong>: 避免婚后因经济地位不对等产生矛盾</li>
          <li><strong>涉外 / 跨境资产</strong>: 涉及不同国籍, 不同法域的财产</li>
          <li><strong>婚前已同居, 财产混同</strong>: 区分共同财产与个人财产</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          三、必备条款 (6 大模块)
        </h2>
        <ol className="list-decimal pl-6 space-y-3">
          <li>
            <strong>双方基本信息</strong>: 姓名, 身份证号, 户籍地址, 联系方式.
          </li>
          <li>
            <strong>婚前财产清单</strong>: 详细列明房产 (地址 + 产权证号), 车辆 (车牌 + 行驶证号),
            公司股权 (公司名 + 出资比例), 银行存款, 理财产品, 股票基金, 知识产权, 债权债务等.
          </li>
          <li>
            <strong>婚后财产约定</strong>: 工资, 投资收益, 知识产权收益等婚后所得的归属.
            三种模式: (1) 各自所有 (2) 共同所有 (3) 约定份额.
          </li>
          <li>
            <strong>共同债务与个人债务的认定</strong>: 哪些属于夫妻共同债务, 哪些属于个人债务,
            以及对外举债时另一方的知情权与追认权.
          </li>
          <li>
            <strong>生活费用承担</strong>: 日常开销, 房贷, 子女教育, 父母赡养等费用的分摊方式.
          </li>
          <li>
            <strong>变更与解除</strong>: 协议变更或解除的条件, 违约责任, 争议解决方式 (诉讼 / 仲裁).
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          四、公证流程 (3 步)
        </h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>准备材料</strong>: 双方身份证, 户口本, 财产凭证 (房产证, 行驶证, 股权证明等)</li>
          <li><strong>起草协议</strong>: 可自行书写, 也可委托专业机构起草 (如家有所爱 ¥19.9 系统化生成)</li>
          <li><strong>到公证处办理</strong>: 双方共同到任一方户籍所在地或经常居住地的公证处, 现场签字, 公证员审查. 公证费一般 200-500 元 / 份</li>
        </ol>
        <p className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm leading-relaxed-cn mt-3">
          <strong>⚠️ 重要提示</strong>: 未公证的婚前协议同样具有保障效果, 但公证后的协议在举证时效力更强, 法院通常直接采信.
          涉及不动产的, 还可到不动产登记中心办理「夫妻财产约定备案」, 防止第三方善意取得.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          五、5 个常见误区
        </h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>
            <strong>「伤感情, 不需要」</strong>: 婚前协议恰恰是对感情的尊重和保护, 把可能引发矛盾的财产问题前置解决, 让婚姻更纯粹.
          </li>
          <li>
            <strong>「口头约定也行」</strong>: 《民法典》明确要求书面形式. 口头约定在诉讼中举证极难, 法院通常不采信.
          </li>
          <li>
            <strong>「只约定房产就行」</strong>: 现代家庭财产形态多样, 还需要覆盖车辆, 股权, 投资收益, 知识产权, 数字资产 (如游戏装备, 加密货币).
          </li>
          <li>
            <strong>「签了就一成不变」</strong>: 婚前协议可经双方协商一致变更或解除, 但需要书面形式.
          </li>
          <li>
            <strong>「协议能限制离婚自由」</strong>: 协议不能限制任何一方的离婚自由, 也不能违反法律强制性规定 (如不得限制一方的人身权利).
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          六、价格 / 服务选择
        </h2>
        <p>
          婚前协议模板市面价格从免费到数千元不等. 主要差异在:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>模板覆盖度</strong>: 6 大模块是否齐全, 是否有配套填写说明</li>
          <li><strong>是否支持个性化</strong>: 复杂家庭情况 (再婚 / 跨境 / 股权) 能否定制</li>
          <li><strong>是否有专业人士把关</strong>: 律师 / 资产规划人员 1 对 1 审核</li>
        </ul>
        <p className="mt-3">
          <Link href="/doc-type?type=marriage" className="text-amber-700 hover:text-amber-800 underline font-medium">
            家有所爱婚前 / 婚姻协议书
          </Link>
          {' '}: ¥19.9 系统化生成 (10 分钟), ¥999 专家版含资产规划专业人士 1 对 1 视频审核.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          七、相关文书
        </h2>
        <ul className="list-disc pl-6 space-y-1">
          <li><Link href="/guide/during-marriage" className="text-amber-700 hover:underline">婚内财产协议</Link> (婚后签订, 调整财产归属)</li>
          <li><Link href="/guide/gift" className="text-amber-700 hover:underline">赠与协议</Link> (父母出资明确赠与一方)</li>
          <li><Link href="/guide/inheritance" className="text-amber-700 hover:underline">财富传承规划</Link> (遗产分配预案)</li>
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
