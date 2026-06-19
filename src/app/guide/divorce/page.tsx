import type { Metadata } from 'next';
import Link from 'next/link';
import { GuideArticle } from '@/components/GuideArticle';

export const metadata: Metadata = {
  title: '离婚协议书怎么写 - 完整指南 2026 (附模板)',
  description: '离婚协议书完整指南: 财产分割 / 子女抚养 / 债务安排 / 冷静期流程 / 民政局备案. 协议离婚必备, ¥19.9 系统化生成.',
  keywords: ['离婚协议书', '离婚协议', '离婚协议模板', '协议离婚', '财产分割', '抚养费', '冷静期', '民政局'],
  openGraph: {
    title: '离婚协议书怎么写 - 2026 完整指南 | 家有所爱',
    description: '和平分手必备: 财产分割 / 子女抚养 / 债务安排 / 冷静期 30 天 / 民政局备案全流程.',
    url: 'https://aiwill-planner.cn/guide/divorce',
    siteName: '家有所爱',
    locale: 'zh_CN',
    type: 'article',
  },
  alternates: {
    canonical: 'https://aiwill-planner.cn/guide/divorce',
  },
};

export default function DivorceGuide() {
  return (
    <GuideArticle
      title="离婚协议书: 完整指南"
      subtitle="协议离婚是和平分手的最佳方式. 本文覆盖财产分割, 子女抚养, 债务安排, 冷静期 30 天, 民政局备案全流程."
      background="from-slate-50 via-white to-slate-50"
      breadcrumbs={[
        { name: '首页', url: '/' },
        { name: '幸福指南', url: '/guide/pre-marriage' },
        { name: '离婚协议' },
      ]}
      ctaDocType="divorce"
      ctaTitle="10 分钟生成您的离婚协议书"
      ctaDescription="财产 / 抚养 / 债务一站写清, 系统化问卷, ¥19.9 起."
    >
      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          一、协议离婚 vs 诉讼离婚
        </h2>
        <p>
          2021 年《民法典》实施后, 协议离婚新增「30 天冷静期」. 两种方式对比如下:
        </p>
        <div className="overflow-x-auto my-3">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="text-left p-2 border border-slate-200">维度</th>
                <th className="text-left p-2 border border-slate-200">协议离婚</th>
                <th className="text-left p-2 border border-slate-200">诉讼离婚</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border border-slate-200 font-medium">时长</td>
                <td className="p-2 border border-slate-200">30-60 天</td>
                <td className="p-2 border border-slate-200">3-12 个月</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-200 font-medium">费用</td>
                <td className="p-2 border border-slate-200">9 元工本费 + 协议起草</td>
                <td className="p-2 border border-slate-200">律师费 5,000-50,000+</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-200 font-medium">适用条件</td>
                <td className="p-2 border border-slate-200">双方自愿, 财产 / 抚养无争议</td>
                <td className="p-2 border border-slate-200">一方不同意 / 复杂财产 / 抚养争议</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-200 font-medium">后续争议</td>
                <td className="p-2 border border-slate-200">协议明确则较难推翻</td>
                <td className="p-2 border border-slate-200">判决后仍有上诉空间</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-slate-600">
          本指南专注协议离婚. 诉讼离婚请直接委托律师.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          二、必备条款 (8 大模块)
        </h2>
        <ol className="list-decimal pl-6 space-y-3">
          <li>
            <strong>双方基本信息</strong>: 姓名, 身份证号, 户籍, 联系方式.
          </li>
          <li>
            <strong>婚姻基本情况</strong>: 结婚时间, 结婚证字号, 是否生育子女.
          </li>
          <li>
            <strong>离婚原因</strong>: 简单陈述「感情破裂」即可, 民政局不审查具体原因.
          </li>
          <li>
            <strong>子女抚养</strong>: 子女姓名 / 出生日期, 抚养权归属, 抚养费金额与支付方式, 探视安排.
          </li>
          <li>
            <strong>财产分割</strong>: 房产 (地址 + 产权证号 + 归属), 车辆, 存款, 投资, 公司股权, 其他财产.
          </li>
          <li>
            <strong>债务承担</strong>: 夫妻共同债务清单, 一方个人债务, 债权人的通知义务.
          </li>
          <li>
            <strong>经济帮助</strong>: 一方生活困难时, 另一方是否给予适当帮助 (非强制).
          </li>
          <li>
            <strong>其他约定 + 协议生效</strong>: 协议签订时间, 生效条件 (民政局领取离婚证后生效).
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          三、财产分割的 5 大要点
        </h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>
            <strong>房产</strong>: 写明地址 + 产权证号, 归属哪一方. 尚未取得产权证的 (如期房), 需明确离婚后过户安排.
          </li>
          <li>
            <strong>车辆</strong>: 牌照号 + 行驶证号 + 归属.
          </li>
          <li>
            <strong>存款</strong>: 大额存款 (一般 5 万以上) 写明银行 + 账号尾号. 隐匿 / 转移存款的法律后果.
          </li>
          <li>
            <strong>公司股权</strong>: 需先查询工商登记, 明确是「转让给非股东配偶」还是「折价补偿」. 涉及其他股东优先购买权.
          </li>
          <li>
            <strong>公积金 / 社保</strong>: 公积金余额可约定分割; 社保账户一般不可分割.
          </li>
        </ol>
        <p className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm leading-relaxed-cn mt-3">
          <strong>⚠️ 重要提示</strong>: 财产分割应「穷尽列举」, 写「其他无争议」易遗漏.
          建议列明「除上述财产外, 双方无其他夫妻共同财产」+ 签字确认.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          四、子女抚养 5 大要点
        </h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>
            <strong>抚养权</strong>: 写明子女归哪一方直接抚养. 8 周岁以上子女需考虑其意见.
          </li>
          <li>
            <strong>抚养费</strong>: 一般为月总收入的 20-30%, 包含教育, 医疗. 写明支付方式 (月 / 季 / 年) + 接收账户.
          </li>
          <li>
            <strong>抚养费调整</strong>: 因物价, 子女需求变化, 任何一方可起诉要求调整.
          </li>
          <li>
            <strong>探视权</strong>: 频次 (周末 / 节假日 / 寒暑假), 接送方式, 特殊情况处理.
          </li>
          <li>
            <strong>重大事项</strong>: 教育规划 (如出国 / 私立学校), 医疗决策, 需双方协商.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          五、协议离婚 6 步流程
        </h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>准备材料</strong>: 双方身份证, 户口本, 结婚证, 离婚协议书 (一式三份)</li>
          <li><strong>预约民政局</strong>: 微信小程序「全国婚姻登记」或当地民政局官网</li>
          <li><strong>现场申请</strong>: 双方共同到民政局, 提交材料, 工作人员审查</li>
          <li><strong>30 天冷静期</strong>: 自民政局收到申请之日起计算, 任一方不愿离婚可撤回</li>
          <li><strong>30 天后再申请</strong>: 冷静期满后 30 天内, 双方共同到民政局申请发给离婚证</li>
          <li><strong>领取离婚证</strong>: 民政局当场发放, 婚姻关系解除</li>
        </ol>
        <p className="text-sm text-slate-600 mt-3">
          整个流程约 30-60 天. 冷静期内任一方撤回, 则需重新申请.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          六、5 个常见误区
        </h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>
            <strong>「净身出户」条款有效</strong>: 协议可约定一方放弃部分财产, 但不能违反法律强制性规定 (如不能剥夺抚养费).
          </li>
          <li>
            <strong>「离婚后不得再婚」</strong>: 此类条款无效, 限制人身自由.
          </li>
          <li>
            <strong>「抚养费约定一次性付清」</strong>: 一般应按月支付, 一次性支付需明确金额与支付条件.
          </li>
          <li>
            <strong>「孩子改姓」</strong>: 离婚后一方擅自改孩子姓氏, 另一方可起诉要求恢复.
          </li>
          <li>
            <strong>「冷静期内不发生效力」</strong>: 冷静期是给双方「反悔」机会, 冷静期满双方共同申领离婚证后协议生效.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          七、价格 / 服务选择
        </h2>
        <p>
          离婚协议书市面价格 200-3000 元不等, 差异主要在:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>财产类型覆盖度 (房产, 股权, 数字资产等)</li>
          <li>是否考虑子女抚养特殊安排 (如海外教育)</li>
          <li>是否含律师 / 资产规划人员审核</li>
        </ul>
        <p className="mt-3">
          <Link href="/doc-type?type=divorce" className="text-amber-700 hover:text-amber-800 underline font-medium">
            家有所爱离婚协议书
          </Link>
          {' '}: ¥19.9 系统化生成 (10 分钟), ¥999 专家版含资产规划专业人士 1 对 1 视频审核.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          八、相关文书
        </h2>
        <ul className="list-disc pl-6 space-y-1">
          <li><Link href="/guide/child-custody" className="text-amber-700 hover:underline">子女抚养协议</Link> (协议离婚的子协议, 单独签订更详细)</li>
          <li><Link href="/guide/during-marriage" className="text-amber-700 hover:underline">婚内财产协议</Link> (避免走到离婚的方案)</li>
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
