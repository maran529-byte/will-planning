import type { Metadata } from 'next';
import LegalFooter from '@/components/LegalFooter';

export const metadata: Metadata = {
  title: '隐私政策',
  description: '爱的延续 (aiwill-planner) 隐私政策. 详细说明我们如何收集, 使用, 保护您的个人信息.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 sm:py-14">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">隐私政策</h1>
        <p className="text-sm text-slate-500 mb-8">最后更新: 2026-06-07 · 生效日期: 2026-06-07</p>

        <div className="prose prose-slate max-w-none text-slate-700 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mt-6 mb-3">一、我们是谁</h2>
            <p>
              「爱的延续」(域名: aiwill-planner.cn, 以下简称「我们」或「本平台」) 由
              <strong>爱的延续工作室</strong>(注册地: 上海市) 运营.
              我们提供基于系统化的资产规划与遗嘱文书生成参考服务.
            </p>
            <p>本隐私政策依据《中华人民共和国个人信息保护法》《网络安全法》《数据安全法》制定, 适用于您访问和使用本平台的所有行为.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mt-6 mb-3">二、我们收集的信息</h2>
            <h3 className="text-lg font-semibold text-slate-700 mt-4 mb-2">2.1 您主动提供的信息</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>账户信息</strong>: 微信 OpenID / 邮箱 / 昵称 / 头像 (用于账户识别)</li>
              <li><strong>联系信息</strong>: 手机号 (用于专业资产规划人员回访, 客服联系, 提现结算)</li>
              <li><strong>问卷回答</strong>: 您在生成文书时填写的家庭情况, 资产信息, 受益人信息 (PII)</li>
              <li><strong>身份信息</strong>: 真实姓名 (加密存储), 身份证后 4 位 (客服核对用, <strong>不存全卡号</strong>)</li>
            </ul>
            <h3 className="text-lg font-semibold text-slate-700 mt-4 mb-2">2.2 我们自动收集的信息</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>设备信息: 设备型号, 操作系统版本, 浏览器类型</li>
              <li>日志信息: IP 地址, 访问时间, 访问页面, 来源 URL</li>
              <li>Cookie 信息: 推广归因 (aff_ref), 登录态 (wx_openid, admin_session)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mt-6 mb-3">三、信息的使用</h2>
            <p>我们仅在以下目的范围内使用您的个人信息:</p>
            <ol className="list-decimal pl-6 space-y-1">
              <li>提供系统化文书生成, 专业资产规划咨询对接等核心服务</li>
              <li>处理订单支付, 佣金结算, 退款等交易行为</li>
              <li>客服沟通, 投诉处理, 争议解决</li>
              <li>风险控制: 识别刷量, 套现, 违规推广等行为</li>
              <li>法律法规要求的信息保存与披露</li>
            </ol>
            <p className="mt-2">我们<strong>不会</strong>将您的个人信息用于以下目的:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>出售给第三方营销机构</li>
              <li>用于您未明确同意的个性化广告推送</li>
              <li>用于训练第三方 AI/ML 模型 (我们使用的系统服务条款另行约定)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mt-6 mb-3">四、信息的存储与保护</h2>
            <p>
              所有数据存储于<strong>中国大陆境内</strong>的腾讯云 CVM (Supabase OSS 自托管),
              不出境. 我们采取以下措施保护您的数据:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>传输加密</strong>: 全站 HTTPS / TLS 1.3</li>
              <li><strong>存储加密</strong>: 真实姓名等 PII 字段使用 PostgreSQL pgcrypto (AES-256) 加密</li>
              <li><strong>访问控制</strong>: 后端 service_role key 仅服务端使用, 永不下发到客户端</li>
              <li><strong>行级安全</strong>: Supabase RLS 策略确保用户只能访问自己的数据</li>
              <li><strong>审计日志</strong>: 所有数据访问, 修改操作均有日志记录</li>
            </ul>
            <p className="mt-2 text-amber-700 bg-amber-50 p-3 rounded text-sm">
              <strong>特别提示</strong>: 即便采取上述措施, 互联网环境并非 100% 安全.
              如发生数据泄露事件, 我们将在 72 小时内通知您和监管机构.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mt-6 mb-3">五、第三方共享</h2>
            <p>我们仅在以下情况下向第三方共享您的信息:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>支付</strong>: 微信支付, 支付宝, 银行 (仅在您主动支付时)</li>
              <li><strong>系统服务</strong>: MiniMax (上海稀宇科技有限公司) - 用于系统化文案处理, 我们已签署数据处理协议</li>
              <li><strong>云服务</strong>: 腾讯云 (服务器), Cloudflare (CDN, 仅静态资源)</li>
              <li><strong>法律要求</strong>: 司法机关, 监管机构的合法要求</li>
            </ul>
            <p className="mt-2">我们<strong>不会</strong>在您未授权的情况下与广告平台共享您的身份信息.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mt-6 mb-3">六、您的权利</h2>
            <p>依据《个人信息保护法》, 您享有以下权利:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>知情权</strong>: 了解我们如何处理您的信息 (本政策)</li>
              <li><strong>访问权</strong>: 通过 /orders 页面查看您的订单与文书</li>
              <li><strong>更正权</strong>: 微信联系客服修改错误信息</li>
              <li><strong>删除权</strong>: 注销账户时删除您的全部数据 (法定保留除外)</li>
              <li><strong>撤回授权</strong>: 取消关注公众号后, 我们将停止主动推送</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mt-6 mb-3">七、未成年人保护</h2>
            <p>本平台不向 18 周岁以下的未成年人提供服务. 如发现未成年人注册, 我们将主动注销账户并删除数据.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mt-6 mb-3">八、政策更新</h2>
            <p>本政策可能不定期更新. 重大变更将通过站内公告或公众号消息通知您. 继续使用服务即视为接受更新后的政策.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mt-6 mb-3">九、联系我们</h2>
            <p>如对本政策有疑问, 或需行使您的权利, 请通过以下方式联系:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>微信: 关注公众号「爱的延续」, 发送「客服」</li>
              <li>邮箱: privacy@aiwill-planner.cn</li>
              <li>地址: 上海市 (具体地址通过客服索取)</li>
            </ul>
          </section>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
