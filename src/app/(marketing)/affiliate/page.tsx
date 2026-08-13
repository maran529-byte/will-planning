/**
 * /affiliate - 静态展示 + 跳 H5 申请
 *
 * 改版 v2 (2026-07-22, 方案 A 合规修复):
 *   - 旧: requireUser() + ApplyForm (表单) + 读 affiliate 表 (主站变成 dynamic)
 *   - 新: 纯静态展示 + 跳 H5 affiliate
 *   - 架构要求: 主站 0 form 0 input 0 /api/* 调用
 * 改版 v3 (2026-08-13, 博主计划重写):
 *   - 1) 标题/副标题按"博主计划修改" v1.0 重写
 *   - 2) 5 秒 hook + 4 物品列表 + 3 步 + 7 FAQ
 *   - 3) FAQ 内容从素材包营销工具包 v1.0 提取
 *   - 4) 保留「前往 H5 申请」CTA (符合 PC 0 form 合规要求)
 *   - 架构要求文档: /Users/maran/Desktop/架构要求.md
 *   - 依据: /Users/maran/Desktop/博主计划修改/blogger-action-plan.md
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '博主推广计划 · 家有所爱',
  description:
    '¥19.9 起售 × 15-30% 永久分成 × 7 天自动结算。10 篇笔记模板 + 5 句转化话术 + 海报脚本, 你只管发内容, 其他我们搞定。',
  alternates: {
    canonical: 'https://aiwill-planner.cn/affiliate',
    languages: {
      'zh-CN': 'https://aiwill-planner.cn/affiliate',
      'zh-HK': 'https://aiwill-planner.cn/affiliate',
      'x-default': 'https://aiwill-planner.cn/affiliate',
    },
  },
  openGraph: {
    title: '家有所爱博主推广计划 - ¥19.9 起售 × 15-30% 永久分成',
    description:
      '推广家有所爱智能文书服务, 享 15-30% 长期佣金, 7 天自动结算. 配套素材包直接复制.',
    url: 'https://aiwill-planner.cn/affiliate',
    siteName: '家有所爱',
    locale: 'zh_CN',
    type: 'website',
  },
  keywords: [
    '博主推广',
    '联盟营销',
    '家有所爱',
    '分销计划',
    '高佣联盟',
    '副业赚钱',
    '被动收入',
    'affiliate program',
    '婚姻家事',
    '婚前财产',
    '离婚协议',
    '遗嘱继承',
  ],
};

const FAQ_ITEMS = [
  {
    q: '粉丝多少能加入博主计划?',
    a: '没有硬性门槛。核心是内容垂直度——婚姻/家庭/情感/法律/财富传承, 至少占 60%。素人也欢迎。',
  },
  {
    q: '佣金怎么算?',
    a: '15-30% 永久分成。标准智能版 ¥19.9 你拿 ¥3-6/单; 复杂场景定制 ¥500-2000 你拿 ¥75-600/单; 30 天内客户复购, 你也拿佣金。',
  },
  {
    q: '怎么结算?',
    a: '每 7 天自动结算到微信/支付宝。后台能看每天明细。',
  },
  {
    q: '能推给读者吗?',
    a: '强烈鼓励。有专属推广链接, 永久归你名下, 任何渠道 (小红书/视频号/朋友圈/微信群) 都行。',
  },
  {
    q: '可以接 CPS 分销吗?',
    a: '可以。比一口价更适合律师/律所号——你只出科普内容, 转化我们做, 你拿长期佣金不掉档。',
  },
  {
    q: '会不会被读者骂"恰烂饭"?',
    a: '我们提供的素材话术都强调"工具参考、不构成法律意见、复杂情况找律师"。你自己也建议在内容里说一句"这是我的合作方, 我自己用过觉得不错, 不是律师, 仅供参考"——读者其实很认这种坦诚。',
  },
  {
    q: '什么内容不能发?',
    a: '不能说"律师审核通过 / 法律保障"; 不能晒别人家协议的真实信息; 不能用"渣男/小三"等过激词; 跨境/股权/信托类, 建议推我们的定制服务而不是智能版。',
  },
];

export default function AffiliatePage() {
  return (
    <main>
      {/* === 模块 1 · 5 秒 hook === */}
      <section className="px-6 py-16 text-center bg-gradient-to-b from-amber-50 via-white to-rose-50">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight-cn">
          家有所爱博主推广计划
        </h1>
        <p className="mt-4 text-lg text-slate-700 leading-relaxed-cn">
          ¥19.9 起售 × 15-30% 永久分成 × 7 天自动结算
        </p>
        <p className="mt-2 text-base text-slate-600 leading-relaxed-cn">
          你已经会写内容, 我们搞定产品和售后
        </p>
        <p className="mt-3 text-sm text-slate-500">
          已有 30+ 博主入驻 · 月均佣金 ¥2,500+
        </p>
      </section>

      {/* === 模块 2 · 5 秒价值主张 === */}
      <section className="px-6 py-10 max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-amber-500">
          <p className="text-2xl text-center font-semibold text-slate-800 leading-snug-cn">
            推 1 单 = 赚 ¥3-6
          </p>
          <p className="text-2xl text-center font-semibold text-slate-800 mt-3 leading-snug-cn">
            写 1 篇 = 长期分佣 6 个月
          </p>
        </div>
      </section>

      {/* === 模块 3 · 3 样物品列表 === */}
      <section className="px-6 py-12 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-slate-900">我们提供 3 样东西, 你只要发笔记</h2>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-amber-50 rounded-2xl">
            <div className="text-4xl text-center" aria-hidden="true">📝</div>
            <h3 className="mt-3 font-bold text-center">10 篇笔记模板</h3>
            <p className="mt-2 text-sm text-slate-600 text-center leading-relaxed-cn">
              可直接复制, 改改标题就能发
            </p>
          </div>
          <div className="p-6 bg-rose-50 rounded-2xl">
            <div className="text-4xl text-center" aria-hidden="true">💬</div>
            <h3 className="mt-3 font-bold text-center">5 句转化话术</h3>
            <p className="mt-2 text-sm text-slate-600 text-center leading-relaxed-cn">
              评论区 / 私信直接复制
            </p>
          </div>
          <div className="p-6 bg-yellow-50 rounded-2xl">
            <div className="text-4xl text-center" aria-hidden="true">🎨</div>
            <h3 className="mt-3 font-bold text-center">海报设计脚本</h3>
            <p className="mt-2 text-sm text-slate-600 text-center leading-relaxed-cn">
              丢给美工或自己用 Canva
            </p>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          + 专属推广链接 (永久归你名下) + 1 个免费体验名额
        </p>
      </section>

      {/* === 模块 4 · 3 步开始 === */}
      <section className="px-6 py-12 max-w-3xl mx-auto bg-slate-50 rounded-3xl">
        <h2 className="text-2xl font-bold text-center text-slate-900">3 步开始</h2>
        <div className="mt-8 space-y-4">
          {[
            {
              n: 1,
              t: '申请入驻',
              d: '5 分钟填表 (姓名 / 粉丝量 / 平台 / 微信号). 1-3 个工作日审核, 不卡粉丝量, 卡内容垂直度',
            },
            {
              n: 2,
              t: '拿到素材',
              d: '专属推广链接 + 博主素材包 + 1 个免费体验名额',
            },
            {
              n: 3,
              t: '发笔记',
              d: '复制模板 → 改标题 → 加你的 ref 链接 → 发. 7 天后佣金自动结算',
            },
          ].map((s) => (
            <div
              key={s.n}
              className="flex items-start gap-4 p-5 bg-white rounded-xl shadow-sm"
            >
              <div className="text-2xl font-bold text-amber-500 flex-shrink-0 w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                {s.n}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{s.t}</h3>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed-cn">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* === 模块 5 · CTA === */}
      <section className="px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-3 leading-tight-cn">
          你的粉丝最关心【婚前/婚内/离婚/抚养/赠与/传承】?
        </h2>
        <p className="text-base text-slate-600 mb-6 leading-relaxed-cn">
          5 分钟填表, 立即开始
        </p>
        <Link
          href="https://h5.aiwill-planner.cn/affiliate"
          className="inline-block px-10 py-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          立即申请 →
        </Link>
        <p className="mt-4 text-sm text-slate-500">
          已有账号?{' '}
          <Link href="https://h5.aiwill-planner.cn/login" className="text-amber-500 hover:text-amber-600">
            立即登录
          </Link>
        </p>
      </section>

      {/* === 模块 6 · 7 条 FAQ === */}
      <section className="px-6 py-12 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-slate-900">7 条常见问题</h2>
        <div className="mt-8 space-y-4">
          {FAQ_ITEMS.map((item, i) => (
            <details
              key={i}
              className="p-5 bg-white rounded-xl shadow-sm border border-slate-100 group"
            >
              <summary className="font-semibold text-slate-900 cursor-pointer list-none flex items-start gap-3">
                <span className="text-amber-500 font-bold flex-shrink-0">Q{i + 1}</span>
                <span className="flex-1">{item.q}</span>
                <span className="text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0">▼</span>
              </summary>
              <p className="mt-3 ml-7 text-sm text-slate-600 leading-relaxed-cn">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* === 模块 7 · 边界声明 (合规) === */}
      <section className="px-6 py-10 max-w-3xl mx-auto">
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
          <h3 className="text-base font-bold text-slate-900 mb-2">📌 内容边界 (合规必读)</h3>
          <ul className="text-sm text-slate-600 space-y-2 leading-relaxed-cn">
            <li>✅ 推荐说: AI 起草 + 专业人士通读 · 基于《民法典》核心条款 · ¥19.9 起 · 比律所便宜两个数量级 · PDF + Word 双格式 · 10 分钟完成 · 7 天退款</li>
            <li>❌ 别说: 律师审核 / 法律保障 / 律师出函 / 保证有效 / 100% 成功 / 比律所更专业</li>
            <li>📍 完整边界声明: <Link href="/methodology" className="text-amber-500 hover:text-amber-600">/methodology</Link></li>
          </ul>
        </div>
      </section>

      {/* LegalFooter 已由 app/layout.tsx 统一渲染, 此页面不重复 (改版 2026-08-04) */}
    </main>
  );
}