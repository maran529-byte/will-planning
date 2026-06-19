import type { Metadata } from 'next';
import Link from 'next/link';
import { GuideArticle } from '@/components/GuideArticle';

export const metadata: Metadata = {
  title: '赠与协议怎么写 - 房产/股权/大额资产 2026 指南',
  description: '赠与协议完整指南: 房产 / 股权 / 大额现金赠与, 税费 / 公证 / 撤销权. 父母赠与 / 婚前赠与必备, ¥19.9 系统化生成.',
  keywords: ['赠与协议', '房产赠与', '股权赠与', '赠与公证', '父母赠与', '婚前赠与', '赠与税', '撤销权'],
  openGraph: {
    title: '赠与协议怎么写 - 2026 完整指南 | 家有所爱',
    description: '房产 / 股权 / 现金 3 大类资产赠与全解析: 税费 + 公证 + 撤销权 + 风险防范.',
    url: 'https://aiwill-planner.cn/guide/gift',
    siteName: '家有所爱',
    locale: 'zh_CN',
    type: 'article',
  },
  alternates: {
    canonical: 'https://aiwill-planner.cn/guide/gift',
  },
};

export default function GiftGuide() {
  return (
    <GuideArticle
      title="赠与协议: 完整指南"
      subtitle="房产 / 股权 / 大额现金, 3 大类资产定向传承. 让爱意直达, 避免身后纠纷."
      background="from-emerald-50 via-white to-emerald-50"
      breadcrumbs={[
        { name: '首页', url: '/' },
        { name: '幸福指南', url: '/guide/pre-marriage' },
        { name: '赠与协议' },
      ]}
      ctaDocType="gift"
      ctaTitle="10 分钟生成您的赠与协议"
      ctaDescription="覆盖房产 / 股权 / 现金, 系统化问卷, ¥19.9 起."
    >
      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          一、什么是赠与协议?
        </h2>
        <p>
          赠与协议, 是赠与人将自己的财产无偿给予受赠人, 受赠人表示接受赠与的合同.
          根据《民法典》第六百五十七条.
        </p>
        <p>
          赠与可以是「生前赠与」(赠与人生前转移财产) 或「遗嘱赠与」(身后通过遗嘱处分).
          本指南专注生前赠与.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          二、3 大常见场景
        </h2>
        <ol className="list-decimal pl-6 space-y-3">
          <li>
            <strong>父母赠与子女</strong>: 最常见, 如父母买房登记在子女名下, 父母赠与现金给子女创业.
            关键: 明确「只赠与自己子女」还是「赠与夫妻双方」, 涉及婚姻财产.
          </li>
          <li>
            <strong>祖辈隔代赠与</strong>: (外) 祖父母直接赠与孙辈, 跳过子女一代.
            涉及父母作为监护人代为接受.
          </li>
          <li>
            <strong>婚前赠与</strong>: 一方父母在子女婚前赠与, 明确是「只给自己子女」,
            避免被认定为夫妻共同财产.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          三、3 类资产的具体操作
        </h2>

        <h3 className="text-lg font-semibold text-slate-700 mt-4 mb-2">3.1 房产赠与</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>直系亲属赠与</strong>: 契税 3%, 免增值税, 个人所得税一般不征 (符合条件)</li>
          <li><strong>非直系亲属</strong>: 契税 3%, 增值税 5.6% (满 2 年免), 个税 20%</li>
          <li><strong>公证</strong>: 直系亲属赠与房产, 部分城市要求公证, 公证费 200-1000 元</li>
          <li><strong>过户</strong>: 到不动产登记中心办理, 需双方身份证, 房产证, 赠与协议</li>
          <li><strong>限购</strong>: 受赠人需有购房资格 (受赠房产计入套数)</li>
        </ul>
        <p className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm leading-relaxed-cn mt-3">
          <strong>⚠️ 房产赠与 vs 继承 vs 买卖</strong>: 三种方式税费差异大.
          一般继承税费最低, 但需被继承人去世后才能办; 赠与适合生前规划; 买卖需受赠人有购房资格.
        </p>

        <h3 className="text-lg font-semibold text-slate-700 mt-4 mb-2">3.2 股权赠与</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>个人股东</strong>: 个人所得税 20%, 印花税 0.05%</li>
          <li><strong>有限公司</strong>: 需通知其他股东, 30 天内未答复视为同意 (优先购买权)</li>
          <li><strong>股份公司</strong>: 股份公司股权赠与无优先购买权限制</li>
          <li><strong>工商变更</strong>: 到市场监督管理局办理股东变更登记</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-700 mt-4 mb-2">3.3 大额现金赠与</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>金额上限</strong>: 单日 / 单笔超 5 万建议转账 (现金赠与举证难)</li>
          <li><strong>个税</strong>: 亲属间小额赠与免个税; 大额 (如 100 万 +) 需评估</li>
          <li><strong>证明</strong>: 银行转账备注「赠与」, 留存赠与协议</li>
          <li><strong>撤销</strong>: 现金赠与一旦交付, 原则上不可撤销 (除法定情形)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          四、必备条款
        </h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>双方基本信息</strong>: 赠与人, 受赠人姓名 / 身份证号 / 住址</li>
          <li><strong>赠与财产描述</strong>: 房产 (地址 + 产权证号), 股权 (公司名 + 持股比例), 现金 (金额)</li>
          <li><strong>赠与性质</strong>: 明确是「只赠与受赠人个人」还是「赠与受赠人及其配偶」</li>
          <li><strong>交付与过户</strong>: 现金转账时间, 房产 / 股权过户时间, 双方协助义务</li>
          <li><strong>税费承担</strong>: 赠与涉及的税费由谁承担</li>
          <li><strong>撤销权</strong>: 是否放弃任意撤销权 (公证后不可撤销)</li>
          <li><strong>其他条件</strong>: 受赠人义务 (如有), 如「专款用于教育」</li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          五、撤销权的 3 大法定情形
        </h2>
        <p>
          根据《民法典》第六百六十三条, 赠与人在以下情形可撤销赠与:
        </p>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>严重侵害赠与人或其近亲属</strong>: 如受赠人对赠与人实施家庭暴力, 虐待</li>
          <li><strong>不履行抚养义务</strong>: 受赠人不履行对赠与人的抚养义务</li>
          <li><strong>不履行约定义务</strong>: 附义务赠与, 受赠人不履行约定义务</li>
        </ol>
        <p className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm leading-relaxed-cn mt-3">
          <strong>💡 重要</strong>: 经过公证的赠与, 赠与人不再享有任意撤销权 (第六百五十八条).
          涉及不动产, 赠与人在转移登记前可撤销; 登记后不可撤销 (法定情形除外).
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          六、5 个常见误区
        </h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>
            <strong>「写了协议就完事」</strong>: 房产 / 股权需办理过户登记, 否则不发生物权变动.
          </li>
          <li>
            <strong>「赠与给孩子, 配偶不能分」</strong>: 未明确「只赠与子女个人」时, 婚后赠与默认夫妻共同财产.
          </li>
          <li>
            <strong>「可以任意反悔」</strong>: 公证后或已过户的, 不可任意撤销.
          </li>
          <li>
            <strong>「赠与一定比继承划算」</strong>: 需综合考虑税费, 限购, 家庭情况. 继承 (身后) 个税最低.
          </li>
          <li>
            <strong>「口头赠与也有效」</strong>: 房产, 股权, 金额较大的赠与应书面, 必要时公证.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          七、价格 / 服务选择
        </h2>
        <p>
          赠与协议市面价格 500-5000 元不等, 差异在:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>资产类型 (房产 / 股权 / 现金) 复杂度</li>
          <li>是否含税费测算, 过户流程指导</li>
          <li>是否含律师 / 资产规划人员审核</li>
        </ul>
        <p className="mt-3">
          <Link href="/doc-type?type=gift" className="text-amber-700 hover:text-amber-800 underline font-medium">
            家有所爱赠与协议
          </Link>
          {' '}: ¥19.9 系统化生成 (含税费测算), ¥999 专家版含资产规划专业人士 1 对 1 视频审核.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          八、相关文书
        </h2>
        <ul className="list-disc pl-6 space-y-1">
          <li><Link href="/guide/pre-marriage" className="text-amber-700 hover:underline">婚前财产协议</Link> (赠与后的财产归属)</li>
          <li><Link href="/guide/during-marriage" className="text-amber-700 hover:underline">婚内财产协议</Link></li>
          <li><Link href="/guide/inheritance" className="text-amber-700 hover:underline">财富传承规划</Link> (身后安排)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          九、写作教程索引
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
