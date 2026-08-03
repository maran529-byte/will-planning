// =============================================================================
// /compare 路由 - 修复 404（P1）
// =============================================================================
// 用途: 修复 aiwill-planner.cn/compare 与 h5.aiwill-planner.cn/compare 双 404
// 部署: 复制到 ~/aiwill-planner/src/app/(marketing)/compare/page.tsx
//       然后 git push → Vercel 自动部署
// =============================================================================

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "家有所爱 vs 传统律师 · 6 维度对比",
  description:
    "智能文书 vs 传统律师 6 维度对比：价格、速度、隐私、合规、修改、售后。帮你判断哪个更适合家庭法律文书场景。",
  alternates: { canonical: "https://aiwill-planner.cn/compare" },
  openGraph: {
    title: "家有所爱 vs 传统律师 · 6 维度对比",
    description: "6 类家庭法律文书：婚前/婚内/离婚/抚养/赠与/传承。智能版 ¥19.9 vs 专家版 ¥999。",
    url: "https://aiwill-planner.cn/compare",
    type: "article",
  },
};

export default function ComparePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <section className="px-6 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
          家有所爱 vs 传统律师
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          6 维度对比，帮你判断哪个更适合家庭法律文书场景
        </p>
      </section>

      {/* 对比表 */}
      <section className="px-6 py-12 max-w-5xl mx-auto">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white rounded-2xl shadow-lg overflow-hidden">
            <thead className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
              <tr>
                <th className="px-6 py-4 text-left">维度</th>
                <th className="px-6 py-4 text-left">家有所爱 智能版</th>
                <th className="px-6 py-4 text-left">家有所爱 专家版</th>
                <th className="px-6 py-4 text-left">传统律所</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 font-medium">价格</td>
                <td className="px-6 py-4 text-orange-500 font-bold">¥19.9 起</td>
                <td className="px-6 py-4 text-orange-500 font-bold">¥999 起</td>
                <td className="px-6 py-4">¥3,000 ~ 30,000</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-6 py-4 font-medium">生成速度</td>
                <td className="px-6 py-4">5 ~ 10 分钟</td>
                <td className="px-6 py-4">1 ~ 3 个工作日（含律师审）</td>
                <td className="px-6 py-4">3 ~ 14 个工作日</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium">隐私</td>
                <td className="px-6 py-4">匿名问卷 + 加密存储</td>
                <td className="px-6 py-4">同上 + 律师执业保密</td>
                <td className="px-6 py-4">当面/电话咨询</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-6 py-4 font-medium">合规</td>
                <td className="px-6 py-4">模板 + ICP 备案</td>
                <td className="px-6 py-4">律师执业证号 + 责任切割</td>
                <td className="px-6 py-4">律协监管</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium">修改</td>
                <td className="px-6 py-4">7 天内无限次</td>
                <td className="px-6 py-4">30 天内 1 次免费</td>
                <td className="px-6 py-4">按小时计费</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-6 py-4 font-medium">售后</td>
                <td className="px-6 py-4">公众号客服 + 关键词自动回复</td>
                <td className="px-6 py-4">1v1 律师微信</td>
                <td className="px-6 py-4">律所助理</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 4 类家庭场景选择 */}
      <section className="px-6 py-12 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900">4 类家庭场景怎么选？</h2>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-2xl shadow-md border-l-4 border-orange-500">
            <h3 className="text-xl font-bold">A. 智能版 ¥19.9</h3>
            <p className="mt-2 text-sm text-gray-600">适合：</p>
            <ul className="mt-2 text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>双方协商一致，仅需落地</li>
              <li>资产结构简单（无公司/股权）</li>
              <li>预算敏感、时间敏感</li>
              <li>学习目的，了解文书结构</li>
            </ul>
          </div>

          <div className="p-6 bg-white rounded-2xl shadow-md border-l-4 border-pink-500">
            <h3 className="text-xl font-bold">B. 智能 + 公证 ¥99</h3>
            <p className="mt-2 text-sm text-gray-600">适合：</p>
            <ul className="mt-2 text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>需要强制执行力</li>
              <li>对方可能反悔</li>
              <li>涉及大额资产（房产/股权）</li>
            </ul>
          </div>

          <div className="p-6 bg-white rounded-2xl shadow-md border-l-4 border-yellow-500">
            <h3 className="text-xl font-bold">C. 专家版 ¥999</h3>
            <p className="mt-2 text-sm text-gray-600">适合：</p>
            <ul className="mt-2 text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>情况复杂（跨境/再婚/未成年子女）</li>
              <li>需专业律师签字 + 责任承担</li>
              <li>高净值家庭传承规划</li>
            </ul>
          </div>

          <div className="p-6 bg-white rounded-2xl shadow-md border-l-4 border-gray-500">
            <h3 className="text-xl font-bold">D. 必须找律师</h3>
            <p className="mt-2 text-sm text-gray-600">以下情况请直接联系律所：</p>
            <ul className="mt-2 text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>已进入诉讼程序</li>
              <li>对方失联/拒绝沟通</li>
              <li>涉及刑事/家事纠纷</li>
              <li>跨境法律冲突</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900">先从智能版开始</h2>
        <p className="mt-2 text-gray-600">5 分钟填问卷 · 1 分钟出草稿 · 7 天内无限次修改</p>
        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="https://h5.aiwill-planner.cn/doc-type"
            className="inline-block px-8 py-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-2xl text-lg font-semibold shadow-lg"
          >
            选文书类型 →
          </Link>
          <Link
            href="https://h5.aiwill-planner.cn/knowledge"
            className="inline-block px-8 py-4 border-2 border-orange-500 text-orange-500 rounded-2xl text-lg font-semibold"
          >
            阅读知识中心
          </Link>
        </div>
      </section>

      {/* 备案 */}
      <section className="px-6 py-8 text-center text-xs text-gray-400">
        家有所爱工作室 © 2026 · 沪ICP备2026020925号-1 · 沪公网安备31011502406720号
      </section>
    </main>
  );
}