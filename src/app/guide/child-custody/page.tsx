import type { Metadata } from 'next';
import Link from 'next/link';
import { GuideArticle } from '@/components/GuideArticle';

export const metadata: Metadata = {
  title: '子女抚养协议怎么写 - 完整指南 2026',
  description: '子女抚养协议完整指南: 抚养费标准 / 探视安排 / 教育规划 / 医疗决策 / 祖辈角色. 已婚 / 离异家庭必备, ¥19.9 系统化生成.',
  keywords: ['子女抚养协议', '抚养费', '探视权', '抚养权', '抚养费标准', '教育规划', '祖辈抚养'],
  openGraph: {
    title: '子女抚养协议怎么写 - 2026 完整指南 | 家有所爱',
    description: '抚养费 / 探视 / 教育 / 医疗 4 大模块全解析, 民法典新规 + 实操模板.',
    url: 'https://aiwill-planner.cn/guide/child-custody',
    siteName: '家有所爱',
    locale: 'zh_CN',
    type: 'article',
  },
  alternates: {
    canonical: 'https://aiwill-planner.cn/guide/child-custody',
  },
};

export default function ChildCustodyGuide() {
  return (
    <GuideArticle
      title="子女抚养协议: 完整指南"
      subtitle="抚养费 / 探视 / 教育 / 医疗, 4 大模块全覆盖. 让孩子的成长安排清晰, 让父母双方都安心."
      background="from-blue-50 via-white to-blue-50"
      breadcrumbs={[
        { name: '首页', url: '/' },
        { name: '幸福指南', url: '/guide/pre-marriage' },
        { name: '子女抚养' },
      ]}
      ctaDocType="child-custody"
      ctaTitle="10 分钟生成您的子女抚养协议"
      ctaDescription="覆盖抚养费, 探视, 教育, 医疗, 系统化问卷, ¥19.9 起."
    >
      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          一、什么是子女抚养协议?
        </h2>
        <p>
          子女抚养协议, 也称「抚养协议」「子女抚养安排」, 是父母双方对未成年子女
          (一般 0-18 周岁) 的抚养权, 抚养费, 探视权, 教育, 医疗等事项作出的书面约定.
        </p>
        <p>
          适用场景: 协议离婚必备附件 / 婚后分居 / 未婚生育 / 再婚家庭 / 单亲家庭,
          或父母希望对子女成长安排进行长期规划.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          二、4 大核心模块
        </h2>
        <ol className="list-decimal pl-6 space-y-3">
          <li>
            <strong>抚养权归属</strong>: 写明子女归哪一方直接抚养 (生活, 教育的日常负责方).
            一般原则: 2 周岁以下随母亲; 2-8 周岁综合考量; 8 周岁以上尊重子女意愿.
            协议可约定「共同抚养」, 但实践中较少见.
          </li>
          <li>
            <strong>抚养费</strong>: 包含生活费, 教育费, 医疗费. 一般按月支付,
            金额参考月总收入的 20-30%, 多个子女可适当提高比例 (不超过 50%).
            写明支付方式 (月 / 季 / 年), 接收账户, 调整机制.
          </li>
          <li>
            <strong>探视权</strong>: 不直接抚养方享有的探视安排. 包括频次 (周末, 节假日, 寒暑假, 生日),
            接送方式 (对方协助 / 第三方), 特殊情况 (生病, 考试季) 处理.
          </li>
          <li>
            <strong>重大事项决策</strong>: 教育 (择校, 出国, 兴趣班), 医疗 (重大手术, 疫苗),
            宗教, 姓名变更等重大事项的决策机制. 一般需双方协商一致.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          三、抚养费详解
        </h2>
        <h3 className="text-lg font-semibold text-slate-700 mt-4 mb-2">3.1 包含范围</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>生活费</strong>: 衣食住行, 日常开销</li>
          <li><strong>教育费</strong>: 学费, 培训费, 兴趣班, 校服, 教材</li>
          <li><strong>医疗费</strong>: 基础医疗, 重大疾病 (一般设定金额上限如 ¥5000, 超出双方各半)</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-700 mt-4 mb-2">3.2 计算参考</h3>
        <p>
          根据最高人民法院《关于适用〈中华人民共和国民法典〉婚姻家庭编的解释 (一)》:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>有固定收入: 月总收入的 20-30%</li>
          <li>负担两个以上子女: 比例可适当提高, 一般不超过 50%</li>
          <li>无固定收入: 参照当年总收入或同行业平均收入, 按上述比例确定</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-700 mt-4 mb-2">3.3 调整机制</h3>
        <p>
          协议应明确约定「调整条件」, 如:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>物价指数变化超 10%</li>
          <li>子女教育阶段变化 (如升入私立学校)</li>
          <li>支付方收入变化超 30%</li>
        </ul>
        <p className="text-sm text-slate-600 mt-2">
          调整需双方协商, 协商不成可起诉至法院.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          四、探视权安排要点
        </h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>频次</strong>: 常见方案 — 每周 1 次 + 法定节假日 + 寒暑假集中</li>
          <li><strong>时间</strong>: 周末上午 9 点至晚 6 点, 节假日 1-3 天, 寒暑假 14-30 天</li>
          <li><strong>地点</strong>: 对方家中 / 公共场所 (公园, 餐厅) / 祖辈家中</li>
          <li><strong>接送</strong>: 直接抚养方协助接送至指定地点, 避免交接时冲突</li>
          <li><strong>特殊情况</strong>: 子女生病, 期末考试, 春节等家庭重要节点</li>
        </ol>
        <p className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm leading-relaxed-cn mt-3">
          <strong>⚠️ 探视权执行</strong>: 一方阻碍另一方探视的, 可起诉至法院.
          法院可采取罚款, 拘留等措施, 严重阻碍的可变更抚养权.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          五、特殊情形
        </h2>
        <ol className="list-decimal pl-6 space-y-3">
          <li>
            <strong>祖辈抚养</strong>: 祖父母 / 外祖父母实际承担抚养责任的, 可在协议中明确,
            涉及祖辈的探视 / 决策权需特别约定.
          </li>
          <li>
            <strong>再婚家庭</strong>: 一方再婚, 继父母与继子女关系的处理.
            继父母对继子女无法律抚养义务, 但协议可约定「视同亲生」的照顾责任.
          </li>
          <li>
            <strong>海外 / 跨境</strong>: 一方带孩子出国, 另一方的探视, 监护权执行,
            涉及国际私法, 建议律师介入.
          </li>
          <li>
            <strong>特殊儿童</strong>: 残疾, 慢性病, 天才儿童等特殊教育需求,
            需详细约定长期医疗, 教育投入.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          六、5 个常见误区
        </h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>
            <strong>「抚养费给到 18 岁就完了」</strong>: 子女尚在校接受高中及以下教育的,
            抚养费一般给付至高中毕业. 特殊情况 (上大学, 患病) 可延长.
          </li>
          <li>
            <strong>「探视权可放弃」</strong>: 探视权既是权利也是义务, 不可协议放弃.
            不直接抚养方不探视的, 直接抚养方也不能阻止.
          </li>
          <li>
            <strong>「抚养费可抵销」</strong>: 抚养费是子女的权益, 不能与另一方债务抵销.
          </li>
          <li>
            <strong>「口头承诺就有效」</strong>: 子女抚养协议应书面, 涉及金额支付的还应明确支付凭证.
          </li>
          <li>
            <strong>「协议签订后无法变更」</strong>: 子女抚养协议可根据子女需要变化申请变更.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          七、价格 / 服务选择
        </h2>
        <p>
          <Link href="/doc-type?type=child-custody" className="text-amber-700 hover:text-amber-800 underline font-medium">
            家有所爱子女抚养协议
          </Link>
          {' '}: ¥19.9 系统化生成 (含抚养费计算器, 探视日历), ¥999 专家版含资产规划专业人士 1 对 1 视频审核.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          八、相关文书
        </h2>
        <ul className="list-disc pl-6 space-y-1">
          <li><Link href="/guide/divorce" className="text-amber-700 hover:underline">离婚协议书</Link> (抚养协议作为附件)</li>
          <li><Link href="/guide/during-marriage" className="text-amber-700 hover:underline">婚内财产协议</Link></li>
          <li><Link href="/guide/gift" className="text-amber-700 hover:underline">赠与协议</Link> (财产定向给子女)</li>
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
