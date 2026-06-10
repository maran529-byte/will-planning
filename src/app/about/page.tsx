import type { Metadata } from 'next';
import LegalFooter from '@/components/LegalFooter';
import { BrandLogo } from '@/components/BrandLogo';

export const metadata: Metadata = {
  title: '关于我们',
  description: '爱的延续 (aiwill-planner) 团队介绍. 我们是谁, 我们为什么做这件事.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-amber-50 to-white">
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 sm:py-14">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <BrandLogo size="lg" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-3">💝 关于我们</h1>
          <p className="text-base text-slate-600">让爱与财富, 安心传承</p>
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 text-slate-700">
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">🎯 我们为什么做这件事</h2>
            <p>
              在中国, 超过 60% 的成年人从未立过遗嘱. 原因不是「不需要」, 而是「不知道从何开始」,「觉得专业咨询太贵」,「忌讳谈生死」.
            </p>
            <p className="mt-3">
              我们相信, <strong>遗嘱不是终点, 而是爱意的延续</strong>.
              一份清晰的文书, 能在意外来临时, 让家人少一点争执, 多一点慰藉.
            </p>
            <p className="mt-3">
              我们的使命: 用系统化模板 + 互联网, 把「立遗嘱」这件事的门槛从「万元 + 数周」降到「百元 + 数小时」.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">👥 团队</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TeamCard emoji="💼" name="专业资产规划团队" role="专业资产规划人员" desc="5+ 年家庭资产规划服务经验, 来自上海, 北京, 广州" />
              <TeamCard emoji="🛠️" name="系统工程师" role="全栈" desc="熟悉数据合规, 个人信息保护, 工程实施" />
              <TeamCard emoji="📝" name="内容编辑" role="法律 + 写作" desc="法学硕士 + 资深编辑, 把复杂条款翻译成人话" />
              <TeamCard emoji="💼" name="运营客服" role="全职" desc="9:00-22:00 微信客服在线, 投诉 24 小时内响应" />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">🏆 我们的优势</h2>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <span className="text-emerald-500 flex-shrink-0">✓</span>
                <span><strong>价格透明</strong>: 智能版 ¥19.9, 专家护航版 ¥999, 无隐藏费用</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500 flex-shrink-0">✓</span>
                <span><strong>系统化模板 + 专业资产规划双保险</strong>: 纯模板不放心? 加 ¥980 让专业资产规划人员 1 对 1 审</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500 flex-shrink-0">✓</span>
                <span><strong>数据不出境</strong>: 所有数据存储于中国大陆腾讯云, 符合《数据安全法》</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500 flex-shrink-0">✓</span>
                <span><strong>隐私优先</strong>: PII 字段加密存储, 30 天可申请彻底删除</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500 flex-shrink-0">✓</span>
                <span><strong>合规备案</strong>: 沪 ICP 备 2026020925 号-1, 工商注册可查</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">🚧 我们不做什么</h2>
            <p>坦诚告知, 帮您做正确决定:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>不替代专业咨询</strong>: 复杂家庭关系 (再婚, 跨境资产, 家族信托) 请直接找专业资产规划人员面谈</li>
              <li><strong>不办理公证</strong>: 公证需本人到公证处, 我们目前不提供代办</li>
              <li><strong>不保证 100% 法律效力</strong>: 文书模板仅供参考, 最终效力以公证或法院认定为准</li>
              <li><strong>不储存您的银行卡 / 支付密码</strong>: 支付走第三方, 我们拿不到您的卡信息</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">📊 发展历程</h2>
            <ol className="space-y-2 border-l-2 border-amber-200 pl-4">
              <li>
                <span className="text-xs text-amber-700 font-mono">2026-03</span>
                <p className="text-sm">项目启动, 3 人核心团队</p>
              </li>
              <li>
                <span className="text-xs text-amber-700 font-mono">2026-04</span>
                <p className="text-sm">微信公众号「爱的延续」注册 (wxid: 30fe5cd917eb2e7a)</p>
              </li>
              <li>
                <span className="text-xs text-amber-700 font-mono">2026-05</span>
                <p className="text-sm">H5 移动端上线, 域名 aiwill-planner.cn 备案完成</p>
              </li>
              <li>
                <span className="text-xs text-amber-700 font-mono">2026-06</span>
                <p className="text-sm">支付 + 管理员后台 + 博主分销系统陆续上线</p>
              </li>
            </ol>
          </section>

          <section className="bg-amber-50 rounded-lg p-5 text-center">
            <h2 className="text-lg font-semibold text-amber-900 mb-2">📮 加入我们 / 联系我们</h2>
            <p className="text-sm text-amber-800 mb-3">商务合作 / 专业资产规划人员加盟 / 媒体报道, 欢迎联系</p>
            <div className="text-sm text-amber-900 space-y-1">
              <p>📧 邮箱: hello@aiwill-planner.cn</p>
              <p>💬 微信公众号: 爱的延续</p>
              <p>📍 注册地: 上海市</p>
            </div>
          </section>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}

function TeamCard({ emoji, name, role, desc }: { emoji: string; name: string; role: string; desc: string }) {
  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{emoji}</span>
        <div>
          <div className="font-semibold text-slate-800 text-sm">{name}</div>
          <div className="text-xs text-amber-700">{role}</div>
        </div>
      </div>
      <p className="text-xs text-slate-600">{desc}</p>
    </div>
  );
}
