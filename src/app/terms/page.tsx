import type { Metadata } from 'next';
import LegalFooter from '@/components/LegalFooter';

export const metadata: Metadata = {
  title: '服务条款 - 家有所爱用户协议',
  description: '家有所爱服务条款: 套餐价格 (智能版 ¥19.9 / 专家版 ¥999), 退款规则, 博主反作弊条款, 免责声明. 使用前请仔细阅读.',
  keywords: ['服务条款', '用户协议', '家有所爱', '退款政策', '博主分销条款', '免责声明'],
  openGraph: {
    title: '家有所爱服务条款 - 套餐 / 退款 / 博主规则',
    description: '明确披露套餐价格, 退款政策, 博主反作弊条款, 免责声明. 不替代专业法律咨询.',
    url: 'https://aiwill-planner.cn/terms',
    siteName: '家有所爱',
    locale: 'zh_CN',
    type: 'website',
  },
  alternates: {
    canonical: 'https://aiwill-planner.cn/terms',
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 sm:py-14">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">服务条款</h1>
        <p className="text-sm text-slate-500 mb-8">最后更新: 2026-06-07 · 生效日期: 2026-06-07</p>

        <div className="prose prose-slate max-w-none text-slate-700 space-y-6">
          <section className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
            <p className="text-amber-900 font-medium mb-2">⚠️ 重要法律声明</p>
            <p className="text-amber-800">
              <strong>本平台提供的所有文书均为「参考模板」, 不具有法律效力.</strong>
              涉及不动产, 大额资产, 复杂家庭关系的, 请务必咨询专业资产规划人员并办理公证.
              我们不对您因使用平台生成文书而遭受的任何损失承担责任.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mt-6 mb-3">一、服务内容</h2>
            <p>「家有所爱」提供以下服务:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>系统化的资产规划问卷与文书生成参考</li>
              <li>专业资产规划人员咨询对接 (用户支付后由专业资产规划人员主动联系)</li>
              <li>微信公众号内「家有所爱」(wxid: 30fe5cd917eb2e7a) 的客服与运营消息</li>
              <li>博主分销计划 (用户通过推广链接购买获得佣金)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mt-6 mb-3">二、用户行为规范</h2>
            <p>使用本平台时, 您承诺:</p>
            <ol className="list-decimal pl-6 space-y-1">
              <li>提供的所有信息真实, 准确, 完整</li>
              <li>账户仅限本人使用, 不得转让, 出借</li>
              <li>不得利用本平台从事违法活动或侵犯第三方权益</li>
              <li>不得对平台进行反向工程, 攻击, 爬取等行为</li>
              <li>遵守《民法典》《网络安全法》《数据安全法》等中国法律法规</li>
            </ol>
            <p className="mt-2">违反上述规范, 我们有权立即停止服务并保留追究法律责任的权利.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mt-6 mb-3">三、付费与退款</h2>
            <h3 className="text-lg font-semibold text-slate-700 mt-4 mb-2">3.1 套餐与价格</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>智能版</strong>: ¥19.9 - 系统化生成文书参考</li>
              <li><strong>专家护航版</strong>: ¥999 - 系统化文书 + 专业资产规划人员 1 对 1 审核 + 修改建议</li>
            </ul>
            <p className="mt-2">价格以支付页实际显示为准. 我们保留调整价格的权利, 已下单订单不受影响.</p>

            <h3 className="text-lg font-semibold text-slate-700 mt-4 mb-2">3.2 退款政策</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>未生成文书</strong>: 支付后 24 小时内可申请全额退款</li>
              <li><strong>已生成文书</strong>: 专业资产规划人员未审核前可申请 50% 退款 (覆盖系统化服务成本)</li>
              <li><strong>专业资产规划人员已审核</strong>: 不支持退款 (服务已完成)</li>
              <li>退款申请通过公众号客服或邮件 service@aiwill-planner.cn 提交, 1-3 个工作日处理</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-700 mt-4 mb-2">3.3 支付方式</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>个人微信 / 支付宝收款码 (过渡期, 二清风险由用户自行评估)</li>
              <li>未来将接入微信支付商户号, 支付宝商户号 (商户号上线后以该方式为准)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mt-6 mb-3">四、知识产权</h2>
            <p>本平台的所有内容 (含 系统化起草的文书模板, UI, 文案, 商标) 著作权归「家有所爱工作室」所有.</p>
            <p>您通过本平台生成的文书, 著作权归您本人所有. 您可自由修改, 使用, 销毁.</p>
            <p>未经书面许可, 不得复制, 传播, 销售本平台的内容.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mt-6 mb-3">五、免责声明</h2>
            <p>在法律允许的最大范围内, 我们对以下事项不承担责任:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>因不可抗力 (地震, 疫情, 战争, 网络中断) 导致的服务中断</li>
              <li>因您未及时更新联系信息导致的客服联系失败</li>
              <li>因第三方服务 (微信, 支付通道, 系统服务) 故障导致的服务异常</li>
              <li>因您不当使用本平台文书而造成的法律后果</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mt-6 mb-3">六、博主 (推广者) 特别条款</h2>
            <p>参与本平台博主计划的用户, 须额外遵守:</p>
            <ol className="list-decimal pl-6 space-y-1">
              <li><strong>反作弊</strong>: 禁止刷量 (自己点击 / 机器点击 / 购买点击), 禁止自买自卖</li>
              <li><strong>真实宣传</strong>: 不得虚假宣传, 不得承诺「100% 继承」「绝对有效」等</li>
              <li><strong>结算</strong>: 佣金 T+7 可提现, 最低提现 ¥10, 1-3 工作日到账</li>
              <li><strong>违规处罚</strong>: 首次警告, 二次封禁 (扣除未提现佣金)</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mt-6 mb-3">七、争议解决</h2>
            <p>本条款的解释, 效力及争议解决均适用中华人民共和国法律.</p>
            <p>因本条款产生的争议, 双方应友好协商; 协商不成的, 提交上海市有管辖权的人民法院诉讼解决.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mt-6 mb-3">八、联系我们</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>微信公众号: 家有所爱 (微信号 30fe5cd917eb2e7a)</li>
              <li>客服邮箱: service@aiwill-planner.cn</li>
              <li>法务邮箱: legal@aiwill-planner.cn</li>
            </ul>
          </section>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
