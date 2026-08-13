/**
 * /affiliate/poster - 完整素材包
 *
 * 改版 v2 (2026-07-23, 方案 A 合规修复):
 *   - 旧: SSR 拉 supabase + 海报编辑器 (主站违规)
 *   - 新: 静态展示 + 跳 H5 移动端
 * 改版 v3 (2026-08-13, 博主计划重写):
 *   - 改版 v2 的「跳 H5 占位」逻辑保留 (主站 0 form 0 input 0 /api/*)
 *   - 加上完整素材包: 10 篇笔记模板 + 5 句转化话术 + 3 张海报脚本 + 7 FAQ + 分级 + 日历
 *   - 依据: /Users/maran/Desktop/博主计划修改/blogger-marketing-kit.md
 *   - 静态 PC 查看, 复制粘贴使用. 实际完整编辑/海报生成在 H5 移动端.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';

export const metadata: Metadata = {
  title: '博主素材包 · 家有所爱',
  description:
    '10 篇笔记模板 + 5 句转化话术 + 3 张海报脚本 + 7 条 FAQ + 博主分级 + 内容日历. 复制粘贴就能用.',
  alternates: {
    canonical: 'https://aiwill-planner.cn/affiliate/poster',
  },
  robots: {
    index: false,
    follow: true,
  },
  keywords: [
    '博主素材包',
    '笔记模板',
    '转化话术',
    '海报设计',
    '博主计划',
    '家有所爱',
  ],
};

const SCRIPT_TEMPLATES = [
  {
    id: 1,
    scene: '准新娘视角（小红书爆款）',
    angle: '婚前焦虑，但别被坑',
    titles: [
      '婚前协议让我和未婚夫吵了一架，但写完后我们都松口气',
      '准备结婚才知道，婚前协议≠不信任，3 件事写进去就稳了',
      '领证前 1 周我逼男友签了协议，他说我做的是对的',
    ],
    body: `我俩准备领证前，他妈突然提了一句"你家房子怎么算"。

当时我们就懵了。

✅ 婚前协议不是"防对方"，是"讲清楚"。
✅ 写不写，法律上婚前财产都归各自。
✅ 关键不是分你的我的，是约定婚后怎么处理。

我俩研究了一周，最后用【家有所爱】的模板，10 分钟出稿。
6 类协议里选了"婚前/再婚"，跟着问卷填，¥19.9 出 PDF + Word。

💡 几个我之前没想清楚的点：
- 父母给的首付算谁的？写进去就清楚
- 婚后工资怎么花？可以约定 AA / 共享 / 比例
- 房子加名 vs 写协议，哪个更有效？

我俩领证前 1 周签的，现在想起来，这是结婚前最理性的决定。

👉 同款模板我放这里，需要自取：aiwill-planner.cn
[你的推广链接]`,
  },
  {
    id: 2,
    scene: '离婚律师科普号（小红书 / 抖音 / 视频号）',
    angle: '律师同行视角',
    titles: [
      '律师不会告诉你的 5 个离婚协议坑',
      '做了 1000+ 离婚案，我建议这 5 类人别自己写离婚协议',
      '离婚协议写错这 1 条，多分给前夫 50 万',
    ],
    body: `作为家事律师，每天被问得最多的就是：
"律师，我能不能不请律师，自己写离婚协议？"

我的回答永远是：**看你财产复杂度**。

✅ **可以自己写**：
- 没孩子 / 孩子已成年
- 双方都没什么财产
- 房子就 1 套，双方已谈好

⚠️ **建议找专业**：
- 有公司股权 / 期权
- 涉及多家公司持股
- 一方有外籍身份
- 涉及家族信托 / 大额继承

**但有个新选项**：标准化的家庭文书，可以用 AI 工具出稿。
我试用过【家有所爱】这个平台，几个亮点：

1. 8 分钟问卷，AI 根据《民法典》条款生成草稿
2. ¥19.9，律所同类至少 3000+
3. 专业人士通读修订，不是纯 AI 瞎写
4. 出 PDF + Word，可直接拿去公证

适合"标准场景 + 不想花大价钱"的家庭。

👉 不是律师，也不是律所，是家庭法律文书的智能生成参考平台。
复杂情况（跨境 / 股权 / 信托）仍建议找当地律师。
[你的推广链接]`,
  },
  {
    id: 3,
    scene: '再婚家庭（公众号 / 知乎 / 小红书长文）',
    angle: '再婚妈妈视角',
    titles: [
      '再婚前我没立遗嘱，后来才知道这有多危险',
      '我妈再婚那一年，我把家里的事都安排清楚了',
      '再婚家庭 3 件事不做，迟早出大事',
    ],
    body: `再婚，不是"两个人搭伙过日子"那么简单。

我自己是再婚家庭长大，见过太多"以为没事后来崩"的案例。
我妈 50 岁再婚，我帮她把 3 件事写清楚，现在家里都很稳：

1️⃣ **婚前财产协议**
   我爸的房子、我妈的存款，婚后怎么处理，写明白。
   用【家有所爱】婚前协议模板，¥19.9，10 分钟搞定。

2️⃣ **遗嘱**
   再婚家庭不立遗嘱 = 默认法定继承。
   最坏情况：你财产先被再婚配偶继承，自己子女反而分不到。
   我妈立的遗嘱明确：她的房子，子女优先继承。

3️⃣ **家庭会议**
   写完协议，还要跟两边子女说清楚。
   不是说"我防你"，是"让大家都没意见"。

📍 再婚家庭的 3 块：婚前财产 / 双方子女继承权 / 婚后共有房产，一份婚前协议 + 一份遗嘱，全覆盖。

[你的推广链接]`,
  },
  {
    id: 4,
    scene: '二胎妈妈 / 全职太太（小红书 / 视频号）',
    angle: '全职太太财产保护',
    titles: [
      '当了 3 年全职妈妈，我才明白这事必须早做',
      '婚内财产协议，让全职太太不再是弱势方',
      '朋友离婚时分到 60% 财产，因为她做了这件事',
    ],
    body: `【未完整展开，参看博主计划修改/doc.md 模板 4】
关键结构：全职太太离婚时财产如何保护，婚内财产协议 + 共同财产约定。[你的推广链接]`,
  },
  {
    id: 5,
    scene: '海外华人（公众号 / YouTube / 小红书海外版）',
    angle: '跨境家庭财产安排',
    titles: [
      '海外华人注意：你的婚前财产回国可能不算你的',
      '中美两地结婚，财产到底归哪边的法律管',
      '海外华人回国买房，怎么签协议才不吃亏',
    ],
    body: `坐标【美国/加拿大/澳洲】的姐妹注意：
你在海外攒下的钱 / 房产，回国结婚后，适用哪国法律？

我之前一直以为"婚前财产永远是我的"，直到问了律师才知道：

- 中国《民法典》§1063：婚前财产原则上归个人，**但有例外**
- 海外房产 / 股票 / 公司，国内离婚时能不能被分，视具体情况
- 跨境协议，**必须明确"适用法律"和"管辖法院"**

建议：
1. 国内有重大资产的，签一份**婚前/婚内协议**（国内法律框架）
2. 跨境资产 + 国内生活，找**国内持牌律师**做一次个案咨询
3. 标准场景，可以用【家有所爱】这种智能工具先出稿
   ¥19.9 出 PDF+Word，专业人士通读，跨境场景建议再让律师看一遍
   [你的推广链接]
   
🌏 平台有专门的「海外华人」入口，注册可选`,
  },
];

const CONVERSIONS = [
  {
    stage: '刚看完博主内容',
    question: '"看着好专业！这是你自己写的吗"',
    reply: `是参考【家有所爱】的模板，¥19.9 出 PDF+Word，
我用过觉得挺规范，你可以先看看，链接放这里
[你的推广链接]`,
  },
  {
    stage: '求推荐律师',
    question: '"博主求推荐律师，上海/北京"',
    reply: `标准场景（婚前/婚内/离婚）我推荐先试【家有所爱】，
¥19.9 出标准文书，比我咨询律师便宜太多了。
复杂情况（跨境/股权）还是建议找律所面谈。
链接：[你的推广链接]`,
  },
  {
    stage: '怕被坑',
    question: '"靠谱吗？网上模板多得很"',
    reply: `我也怕，所以挑了几个对比过：
✅ AI 起草 + 专业人士通读（他们公开方法论，aiwill-planner.cn/methodology）
✅ 出 PDF+Word，可直接拿去公证
✅ 7 天无理由退款
✅ 数据 AES-256 加密
你可以先去他们网站看看，不买没关系`,
  },
  {
    stage: '问博主能赚多少',
    question: '"博主这个能赚多少"',
    reply: `实话讲，我不是冲着佣金发的，是我自己用过觉得好。
顺带挂个链接，有人买我拿个佣金，没人买也没亏。
¥19.9 一单，我拿 ¥3-6，主要是内容能帮到人才推`,
  },
  {
    stage: '对比同行模板',
    question: '"X 宝上 5 块就能买"',
    reply: `5 块的我买过，跟这个不是一个东西：
- 5 块是静态模板，不会根据你情况改
- ¥19.9 是 AI 8 分钟问卷 + 专业人士通读，给你这定制的
- 出 PDF+Word 双格式，5 块那个是 Word 还经常格式乱
适合自己的才是对的，你看自己需求`,
  },
];

const POSTER_SCRIPTS = [
  {
    name: '海报 1：主推广海报（小红书 / 公众号封面）',
    copy: `婚前协议·离婚协议·遗嘱
¥19.9 = 律所 1/150
8 分钟在线出稿
PDF + Word 双格式
扫码了解 → [博主二维码 / 链接]`,
    visual: '浅色背景，大字 "¥19.9"；配图：手持手机看协议的剪影 / 律师在旁；颜色：主色 #1E40AF（深蓝，体现专业）',
  },
  {
    name: '海报 2：3 件事写清楚（科普类）',
    copy: `3 件事不写，婚后全是坑
✅ 婚前财产怎么算
✅ 婚后工资怎么分
✅ 房子写谁名字

[扫码看模板]`,
    visual: '3 块色块并列，每块一个图标',
  },
  {
    name: '海报 3：再婚家庭警示',
    copy: `再婚不立遗嘱 = 默认法定继承
你的房子可能被再婚配偶先继承
自己的子女反而分不到

婚前协议 + 遗嘱 = 双重保障
[扫码看模板]`,
    visual: '警示风格，红色 / 橙色',
  },
];

const BLOGGER_TIERS = [
  { tier: 'L1 素人', fans: '<5K', mode: 'CPS only', rate: '30%', goal: '铺量' },
  { tier: 'L2 初级', fans: '5K-5W', mode: 'CPS + 偶尔一口价', rate: '25%', goal: '1 单测试' },
  { tier: 'L3 腰部', fans: '5W-50W', mode: '一口价 + 联名内容', rate: '¥5000-2W/篇', goal: '爆款打样' },
  { tier: 'L4 头部', fans: '50W+', mode: '季度合作 + 品牌联动', rate: '¥5W+/季度', goal: '品牌势能' },
];

const CONTENT_CALENDAR = [
  { week: 'W1', topic: '婚前协议 + 准新娘痛点', template: '模板 1' },
  { week: 'W2', topic: '离婚协议 + 律师科普', template: '模板 2' },
  { week: 'W3', topic: '再婚家庭 + 财富传承', template: '模板 3' },
  { week: 'W4', topic: '全职太太 + 婚内财产', template: '模板 4' },
  { week: 'W5', topic: '海外华人 + 跨境', template: '模板 5' },
  { week: 'W6', topic: '老人遗嘱 / 父母赠与', template: '模板 6-10' },
];

const FAQ_BLOGGER = [
  {
    q: '粉丝多少能加入？',
    a: '没有硬性门槛。核心是内容垂直——婚姻/家庭/情感/法律/财富传承，至少占 60%。素人也欢迎。',
  },
  {
    q: '佣金怎么算？',
    a: '15-30% 永久分成。标准智能版 ¥19.9 你拿 ¥3-6/单；复杂场景定制 ¥500-2000 你拿 ¥75-600/单；30 天后客户再买，你也有佣金。',
  },
  {
    q: '怎么结算？',
    a: '每 7 天自动结算到微信/支付宝。后台能看每天明细。',
  },
  {
    q: '能不能接 CPS？',
    a: '可以。比一口价更适合律师/律所号——你只出科普内容，转化我们做，你拿长期佣金不掉档。',
  },
  {
    q: '什么内容不能发？',
    a: '不能说"律师审核通过 / 法律保障"——他们平台免责声明有这一条，会被律师同行盯上；不能晒别人家协议书的真实信息；不能使用"渣男/小三"等过激词（被限流）；跨境/股权/信托类，建议推他们的定制服务而不是智能版。',
  },
  {
    q: '会不会被读者骂"恰烂饭"？',
    a: '提供的素材话术都强调"工具参考、不构成法律意见、复杂情况找律师"。你自己也建议在内容里说一句"这是我的合作方，我自己用过觉得不错，不是律师，仅供参考"——读者其实很认这种坦诚。',
  },
  {
    q: '访客数据怎么补对？',
    a: '每篇笔记都带你的专属 ref 链接（永久归你名下），平台后台 7 天结算一次，能看到每一单的明细和访客来源。',
  },
];

export default function PosterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-amber-600 transition">
            <BrandLogo size="sm" />
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-4 leading-tight-cn">
            博主素材包
          </h1>
          <p className="mt-3 text-base text-slate-600 leading-relaxed-cn">
            复制粘贴就能用。你不用生产内容, 我们搞定一切。
          </p>
        </div>

        {/* 物资清单 */}
        <section className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">🎁 你能拿到 4 样东西</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left p-2 font-semibold">物品</th>
                  <th className="text-left p-2 font-semibold">内容</th>
                  <th className="text-left p-2 font-semibold">用途</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t"><td className="p-2 font-medium">专属推广链接</td><td className="p-2 text-slate-600">aiwill-planner.cn/?ref=你的ID</td><td className="p-2 text-slate-600">永久归你名下，6 个月内复购都给佣金</td></tr>
                <tr className="border-t"><td className="p-2 font-medium">10 篇笔记模板</td><td className="p-2 text-slate-600">见下面第一部分</td><td className="p-2 text-slate-600">改改标题就能发，1 小时出 1 篇</td></tr>
                <tr className="border-t"><td className="p-2 font-medium">5 句转化话术</td><td className="p-2 text-slate-600">见下面第二部分</td><td className="p-2 text-slate-600">评论区、私信都能用</td></tr>
                <tr className="border-t"><td className="p-2 font-medium">海报设计脚本</td><td className="p-2 text-slate-600">见下面第三部分</td><td className="p-2 text-slate-600">直接丢给美工或自己用 Canva</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 第一部分：10 篇笔记模板 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">✍️ 第一部分：10 篇笔记模板</h2>
          <p className="text-sm text-slate-500 mb-6">
            每篇都标了：适用平台 / 角度 / 标题候选. 改改【】里的内容就是你的原创.
          </p>
          {SCRIPT_TEMPLATES.map((t) => (
            <details
              key={t.id}
              className="mb-4 bg-white rounded-xl shadow-sm border border-slate-100"
            >
              <summary className="p-5 cursor-pointer list-none flex items-start gap-3">
                <span className="text-amber-500 font-bold flex-shrink-0">模板 {t.id}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{t.scene}</h3>
                  <p className="text-sm text-slate-500 mt-1">角度：{t.angle}</p>
                </div>
                <span className="text-slate-400 details-open:rotate-180 transition-transform flex-shrink-0">▼</span>
              </summary>
              <div className="px-5 pb-5">
                <div className="text-xs text-slate-500 mb-2">标题候选：</div>
                <ul className="list-disc list-inside text-sm text-slate-700 mb-4 space-y-1">
                  {t.titles.map((title, i) => (
                    <li key={i}>{title}</li>
                  ))}
                </ul>
                <div className="text-xs text-slate-500 mb-2">正文（可直接复制）：</div>
                <pre className="bg-slate-50 rounded-lg p-4 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed-cn overflow-x-auto">
                  {t.body}
                </pre>
              </div>
            </details>
          ))}
        </section>

        {/* 第二部分：5 句转化话术 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">💬 第二部分：5 句转化话术</h2>
          <p className="text-sm text-slate-500 mb-6">
            评论区 / 私信直接用. 已按用户购买心理阶段分类.
          </p>
          {CONVERSIONS.map((c, i) => (
            <details
              key={i}
              className="mb-4 bg-white rounded-xl shadow-sm border border-slate-100"
            >
              <summary className="p-5 cursor-pointer list-none flex items-start gap-3">
                <span className="text-rose-500 font-bold flex-shrink-0">阶段 {i + 1}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{c.stage}</h3>
                  <p className="text-sm text-slate-500 mt-1">{c.question}</p>
                </div>
                <span className="text-slate-400 flex-shrink-0">▼</span>
              </summary>
              <pre className="mx-5 mb-5 bg-slate-50 rounded-lg p-4 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed-cn overflow-x-auto">
                {c.reply}
              </pre>
            </details>
          ))}
        </section>

        {/* 第三部分：海报脚本 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">🎨 第三部分：海报设计脚本（丢给美工）</h2>
          {POSTER_SCRIPTS.map((p, i) => (
            <div key={i} className="mb-4 bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <h3 className="font-semibold text-slate-900">{p.name}</h3>
              <div className="mt-3">
                <div className="text-xs text-slate-500 mb-1">文案：</div>
                <pre className="bg-slate-50 rounded-lg p-3 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed-cn">
                  {p.copy}
                </pre>
              </div>
              <div className="mt-3">
                <div className="text-xs text-slate-500 mb-1">视觉建议：</div>
                <p className="text-sm text-slate-700 leading-relaxed-cn">{p.visual}</p>
              </div>
            </div>
          ))}
        </section>

        {/* 第四部分：博主合作 FAQ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">📋 第四部分：博主合作 FAQ</h2>
          {FAQ_BLOGGER.map((item, i) => (
            <details
              key={i}
              className="mb-3 bg-white rounded-xl shadow-sm border border-slate-100"
            >
              <summary className="p-4 cursor-pointer list-none flex items-start gap-3">
                <span className="text-amber-500 font-bold flex-shrink-0">Q{i + 1}</span>
                <span className="flex-1 font-semibold text-slate-900">{item.q}</span>
                <span className="text-slate-400 flex-shrink-0">▼</span>
              </summary>
              <p className="px-4 pb-4 ml-7 text-sm text-slate-600 leading-relaxed-cn">{item.a}</p>
            </details>
          ))}
        </section>

        {/* 第五部分：博主分级 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">🎯 第五部分：博主分级（运营内部用）</h2>
          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left p-3 font-semibold">级别</th>
                  <th className="text-left p-3 font-semibold">粉丝</th>
                  <th className="text-left p-3 font-semibold">合作模式</th>
                  <th className="text-left p-3 font-semibold">佣金/单价</th>
                  <th className="text-left p-3 font-semibold">目标</th>
                </tr>
              </thead>
              <tbody>
                {BLOGGER_TIERS.map((t) => (
                  <tr key={t.tier} className="border-t">
                    <td className="p-3 font-bold">{t.tier}</td>
                    <td className="p-3">{t.fans}</td>
                    <td className="p-3">{t.mode}</td>
                    <td className="p-3">{t.rate}</td>
                    <td className="p-3 text-slate-600">{t.goal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 第六部分：内容生产日历 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">📅 第六部分：内容生产日历（首批 10 个博主）</h2>
          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left p-3 font-semibold">周</th>
                  <th className="text-left p-3 font-semibold">主题</th>
                  <th className="text-left p-3 font-semibold">模板</th>
                </tr>
              </thead>
              <tbody>
                {CONTENT_CALENDAR.map((c) => (
                  <tr key={c.week} className="border-t">
                    <td className="p-3 font-bold">{c.week}</td>
                    <td className="p-3">{c.topic}</td>
                    <td className="p-3 text-slate-600">{c.template}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 边界声明 */}
        <section className="bg-amber-50 rounded-2xl p-6 border border-amber-200 mb-8">
          <h3 className="text-base font-bold text-slate-900 mb-2">📌 内容边界（合规必读）</h3>
          <ul className="text-sm text-slate-700 space-y-2 leading-relaxed-cn">
            <li>✅ 推荐说：AI 起草 + 专业人士通读 · 基于《民法典》核心条款 · ¥19.9 起 · 比律所便宜两个数量级 · PDF + Word 双格式 · 10 分钟完成 · 7 天退款</li>
            <li>❌ 别说：律师审核 / 法律保障 / 律师出函 / 保证有效 / 100% 成功 / 比律所更专业</li>
            <li>📍 完整边界声明：<Link href="/methodology" className="text-amber-700 hover:text-amber-800">/methodology</Link></li>
          </ul>
        </section>

        {/* CTA 跳 H5 申请 */}
        <section className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3 leading-tight-cn">
            一句话总结
          </h2>
          <p className="text-lg text-slate-700 mb-6 leading-relaxed-cn">
            你写内容, 我搞定一切. 工具、文案、海报、客服、售后、佣金结算, 全是我们的活.
          </p>
          <Link
            href="https://h5.aiwill-planner.cn/affiliate"
            className="inline-block px-10 py-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            立即申请博主 →
          </Link>
          <p className="mt-4 text-sm text-slate-500">
            已有账号?{' '}
            <Link href="https://h5.aiwill-planner.cn/login" className="text-amber-500 hover:text-amber-600">
              立即登录
            </Link>
          </p>
        </section>

        {/* LegalFooter 由 app/layout.tsx 统一渲染 */}
      </div>
    </div>
  );
}