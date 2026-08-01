import type { Metadata } from 'next';
import Link from 'next/link';
import { GuideArticle } from '@/components/GuideArticle';

export const metadata: Metadata = {
  title: '财富传承规划 / 遗嘱怎么写 - 完整指南 2026',
  description: '财富传承规划 (遗嘱) 完整指南: 自书 / 代书 / 公证 / 录音录像遗嘱, 法定继承, 遗产范围. 让家庭财富有序传承, ¥19.9 系统化生成.',
  keywords: ['财富传承', '遗嘱', '自书遗嘱', '公证遗嘱', '法定继承', '遗产', '遗嘱继承', '遗产规划'],
  openGraph: {
    title: '财富传承规划 / 遗嘱怎么写 - 2026 完整指南 | 家有所爱',
    description: '6 种遗嘱形式 + 法定继承 + 遗产范围 + 公证流程 + 常见误区全解析.',
    url: 'https://aiwill-planner.cn/guide/inheritance',
    siteName: '家有所爱',
    locale: 'zh_CN',
    type: 'article',
  },
  alternates: {
    canonical: 'https://aiwill-planner.cn/guide/inheritance',
    languages: {
      'zh-CN': 'https://aiwill-planner.cn/guide/inheritance',
      'zh-HK': 'https://aiwill-planner.cn/guide/inheritance',
      'x-default': 'https://aiwill-planner.cn/guide/inheritance',
    },
  },
};

export default function InheritanceGuide() {
  return (
    <GuideArticle
      title="财富传承规划: 完整指南"
      subtitle="家庭资产有序传承, 提前安排更安心. 6 种遗嘱形式 + 法定继承 + 公证流程, 让爱意延续."
      background="from-purple-50 via-white to-purple-50"
      breadcrumbs={[
        { name: '首页', url: '/' },
        { name: '幸福指南', url: '/guide/pre-marriage' },
        { name: '财富传承' },
      ]}
      ctaDocType="will"
      ctaTitle="10 分钟生成您的财富传承规划"
      ctaDescription="系统化问卷 + 智能生成, 符合《民法典》继承编, ¥19.9 起."
      faqs={[
        {
          q: '《民法典》规定的 6 种遗嘱形式是哪些?',
          a: '民法典第一千一百三十四条至第一千一百四十二条规定了6种: 1) 自书遗嘱: 亲笔书写、签名、注明年月日; 2) 代书遗嘱: 他人代为书写, 需2个以上见证人, 见证人不能是受益人; 3) 打印遗嘱: 电脑打印, 需2个以上见证人, 每页签名+日期; 4) 录音录像遗嘱: 需2个以上见证人在场; 5) 口头遗嘱: 仅危急情况下有效, 需2个以上见证人, 危急情况解除后失效; 6) 公证遗嘱: 由公证处办理.',
        },
        {
          q: '自书遗嘱的有效要件是什么?',
          a: '自书遗嘱生效的三要件: 1) 全文由立遗嘱人亲笔书写 (不能用打印或他人代写); 2) 立遗嘱人亲笔签名; 3) 注明年月日. 全部手写是核心要求. 建议: 字迹清晰、逻辑清楚、财产清单完整, 可附视频说明增加可信度.',
        },
        {
          q: '公证遗嘱比其他遗嘱形式效力更强吗?',
          a: '是的. 公证遗嘱在所有遗嘱形式中证明力最强, 由公证员代书或审查, 含谈话笔录、身份核验、精神状态评估等. 法院审理继承纠纷时, 公证遗嘱通常直接采信, 难以推翻. 费用一般200-800元/份. 大额资产、多子女家庭、再婚、跨境资产、股权等复杂情形建议办理公证遗嘱.',
        },
        {
          q: '法定继承的顺序是什么?',
          a: '民法典规定的法定继承顺序: 第一顺序: 配偶、子女、父母; 第二顺序: 兄弟姐妹、祖父母、外祖父母. 没有第一顺序继承人时, 才由第二顺序继承. 子女包括婚生子女、非婚生子女、养子女和有扶养关系的继子女. 同一顺序继承人一般均等分配.',
        },
        {
          q: '哪些情形会导致遗嘱无效?',
          a: '导致遗嘱无效的常见情形: 1) 立遗嘱人不具有完全民事行为能力(如精神障碍); 2) 受胁迫、欺骗所立; 3) 伪造的遗嘱; 4) 被篡改的内容; 5) 缺少法律要求的形式要件(如代书遗嘱无见证人); 6) 违反「必留份」规定(未给缺乏劳动能力又没有生活来源的继承人保留必要份额); 7) 遗嘱内容违反法律强制性规定或公序良俗.',
        },
        {
          q: '什么是遗赠扶养协议, 与遗嘱有什么区别?',
          a: '遗赠扶养协议是扶养人(可以是继承人、继承人以外的人或组织)承担被扶养人(遗赠人)生养死葬义务, 遗赠人于死后将遗产约定归扶养人所有的协议. 与遗嘱的区别: 遗赠扶养协议是双方协议, 优先于遗嘱继承和法定继承执行; 遗嘱是单方意思表示, 立遗嘱人死亡时生效. 协议还包含扶养义务, 不只是财产分配.',
        },
      ]}
    >
      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          一、什么是财富传承规划?
        </h2>
        <p>
          财富传承规划, 也称「遗产规划」「身后安排」, 是指通过遗嘱 / 信托 / 保险 / 赠与等工具,
          对个人身后的财产分配, 家人照顾, 税务规划等作出预先安排.
        </p>
        <p>
          在中国, 最常见的方式是「遗嘱」. 根据《民法典》第一千一百三十三条,
          自然人可以依照本法规定立遗嘱处分个人财产, 并可以指定遗嘱执行人.
        </p>
        <p className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm leading-relaxed-cn mt-3">
          <strong>💡 为什么需要</strong>: 中国 60%+ 成年人未立遗嘱, 原因包括「觉得不吉利」「不知道从何开始」「觉得太专业太贵」.
          但意外来临时无遗嘱, 财产按法定继承分配, 可能与意愿不符, 引发家庭矛盾.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          二、6 种遗嘱形式
        </h2>
        <p>《民法典》第一千一百三十四条至第一千一百四十二条规定了 6 种遗嘱:</p>
        <ol className="list-decimal pl-6 space-y-3">
          <li>
            <strong>自书遗嘱</strong>: 立遗嘱人亲笔书写, 签名, 注明年月日. 最简便, 无需见证人, 但易被质疑真实性.
          </li>
          <li>
            <strong>代书遗嘱</strong>: 由他人代为书写, 需 2 个以上见证人在场, 见证人不能在遗嘱中受益. 适用于不擅长书写者.
          </li>
          <li>
            <strong>打印遗嘱</strong>: 电脑打印, 需 2 个以上见证人在场, 见证人 + 立遗嘱人在每一页签名, 注明年月日.
          </li>
          <li>
            <strong>录音录像遗嘱</strong>: 需 2 个以上见证人在场, 记录立遗嘱人姓名, 身份, 遗嘱内容, 时间.
          </li>
          <li>
            <strong>口头遗嘱</strong>: 仅在「危急情况」(如生命垂危) 下有效, 需 2 个以上见证人.
            危急情况解除后, 口头遗嘱无效.
          </li>
          <li>
            <strong>公证遗嘱</strong>: 到公证处办理, 由公证员代书或审查. 保障效果最强, 难以推翻.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          三、必备条款
        </h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>立遗嘱人基本信息</strong>: 姓名, 身份证号, 住址, 精神状态 (能清晰表达)</li>
          <li><strong>家庭情况</strong>: 配偶, 子女, 父母, 需赡养的近亲属</li>
          <li><strong>遗产范围</strong>: 房产, 车辆, 存款, 投资, 公司股权, 保险 (有现金价值部分), 知识产权, 数字资产</li>
          <li><strong>继承人指定</strong>: 法定继承人 or 遗赠给法定继承人以外的人 (如朋友, 公益机构)</li>
          <li><strong>分配方式</strong>: 各继承人继承的具体财产, 比例, 条件</li>
          <li><strong>遗嘱执行人</strong>: 指定一人或数人执行遗嘱 (一般是有能力的子女或律师)</li>
          <li><strong>未成年子女 / 父母赡养</strong>: 预留份额, 监护人指定</li>
          <li><strong>签名 + 日期</strong>: 立遗嘱人签名 (不能由他人代签), 注明年月日</li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          四、法定继承 vs 遗嘱继承
        </h2>
        <div className="overflow-x-auto my-3">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="text-left p-2 border border-slate-200">维度</th>
                <th className="text-left p-2 border border-slate-200">法定继承</th>
                <th className="text-left p-2 border border-slate-200">遗嘱继承</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border border-slate-200 font-medium">顺序</td>
                <td className="p-2 border border-slate-200">配偶 → 子女 / 父母 → 兄弟姐妹 / 祖父母</td>
                <td className="p-2 border border-slate-200">按遗嘱指定</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-200 font-medium">份额</td>
                <td className="p-2 border border-slate-200">同一顺序一般均等</td>
                <td className="p-2 border border-slate-200">遗嘱自由 (不得违反公序良俗)</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-200 font-medium">生效</td>
                <td className="p-2 border border-slate-200">被继承人死亡时</td>
                <td className="p-2 border border-slate-200">被继承人死亡时</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-200 font-medium">是否公证</td>
                <td className="p-2 border border-slate-200">否</td>
                <td className="p-2 border border-slate-200">建议公证</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-200 font-medium">纠纷风险</td>
                <td className="p-2 border border-slate-200">较高 (尤其多子女家庭)</td>
                <td className="p-2 border border-slate-200">较低</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm leading-relaxed-cn mt-3">
          <strong>⚠️ 「必留份」</strong>: 即使立遗嘱, 也必须为「缺乏劳动能力又没有生活来源」的继承人保留必要遗产份额.
          否则该部分遗嘱无效.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          五、5 个常见误区
        </h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>
            <strong>「我没有什么财产, 不需要」</strong>: 即使只有一套房, 一辆车, 一笔存款,
            无遗嘱可能导致配偶, 父母, 子女继承份额与意愿不符.
          </li>
          <li>
            <strong>「遗嘱可以随便改」</strong>: 自书 / 代书 / 录音录像遗嘱可变更 / 撤销, 但公证遗嘱变更需再公证.
          </li>
          <li>
            <strong>「写给儿子就是儿子的」</strong>: 婚后继承的财产 (除明确只给个人外) 仍属于夫妻共同财产,
            儿媳 / 女婿有权分割.
          </li>
          <li>
            <strong>「父母遗产一定平分」</strong>: 法律是「一般均等」, 但有特殊情况 (如生活困难, 尽了主要赡养义务) 可不均等.
          </li>
          <li>
            <strong>「遗嘱是最后的安排, 现在不用管」</strong>: 意外随时可能发生, 越早立遗嘱, 越能保证按自己意愿分配.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          六、6 个特殊问题
        </h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>
            <strong>独生子女</strong>: 独生子女不能直接继承父母全部遗产, 还需考虑父母的父母 (祖辈).
            父母立遗嘱可避免「遗产流失」给旁系.
          </li>
          <li>
            <strong>再婚家庭</strong>: 婚前财产, 婚后共同财产, 与前任子女关系, 需详细约定.
          </li>
          <li>
            <strong>数字资产</strong>: 网店, 游戏装备, 数字货币, 社交账号等的继承尚无统一规定, 建议在遗嘱中明确.
          </li>
          <li>
            <strong>公司股权</strong>: 涉及其他股东优先购买权, 公司章程限制, 需提前规划.
          </li>
          <li>
            <strong>保险</strong>: 保险金 (身故受益人) 不属于遗产, 不受遗嘱影响. 可在遗嘱中明确「保险金归属」与「其他遗产」的关系.
          </li>
          <li>
            <strong>境外资产</strong>: 涉及不同法域, 需符合当地法律. 建议咨询专业跨境资产规划.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          七、价格 / 服务选择
        </h2>
        <p>
          财富传承规划市面价格 500-50000 元不等, 差异巨大, 取决于:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>资产规模与复杂度 (房产, 股权, 数字资产)</li>
          <li>家庭情况 (再婚, 跨境, 多子女)</li>
          <li>是否含律师 / 资产规划人员 1 对 1 审核</li>
          <li>是否含公证指导, 后续修订服务</li>
        </ul>
        <p className="mt-3">
          <Link href="/doc-type?type=will" className="text-amber-700 hover:text-amber-800 underline font-medium">
            家有所爱财富传承规划
          </Link>
          {' '}: ¥19.9 系统化生成 (10 分钟); 复杂场景 (跨境 / 股权 / 大额资产) 可
          <Link href="/contact" className="text-amber-600 hover:underline mx-1">
            留言定制服务
          </Link>
          , 由资产规划专业人士 1 对 1 对接.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3 leading-tight-cn">
          八、相关文书
        </h2>
        <ul className="list-disc pl-6 space-y-1">
          <li><Link href="/guide/gift" className="text-amber-700 hover:underline">赠与协议</Link> (生前传承)</li>
          <li><Link href="/guide/pre-marriage" className="text-amber-700 hover:underline">婚前财产协议</Link></li>
          <li><Link href="/guide/during-marriage" className="text-amber-700 hover:underline">婚内财产协议</Link></li>
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
