import Link from "next/link";
import WeChatFollow from "./WeChatFollow";
import { BrandLogo } from "./BrandLogo";

const H5_SITE = "https://h5.aiwill-planner.cn";
const MP_NAME = "爱的延续";
const MP_SEARCH_KEYWORD = "aiwill-planner";

/**
 * LegalFooter - 站点底部 (法律合规 + ICP 备案 + 导航)
 *
 * 改版 v2 (2026-06-09, UI polish):
 *   - 添加 leading-tight-cn / leading-relaxed-cn 中文排版优化
 *   - 添加 aria-label / aria-hidden (外部链接图标)
 *   - 外链 SVG 加 role="img" + aria-label
 *   - 内部 nav 加 aria-label="站点导航"
 */
export default function LegalFooter() {
  return (
    <footer className="bg-slate-800 text-white py-12 px-4 mt-auto">
      <div className="max-w-5xl mx-auto">
        {/* 顶行: 品牌 + 微信关注入口 (紧凑型) */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" textClassName="text-white" />
          </div>
          <WeChatFollow variant="compact" mpName={MP_NAME} mpSearchKeyword={MP_SEARCH_KEYWORD} />
        </div>

        <p className="text-slate-400 text-center mb-6 text-sm leading-relaxed-cn">
          专业资产规划团队 × 合规文书模板<br />
          让爱与财富安心传承
        </p>

        {/* 站点导航 */}
        <nav
          className="border-t border-slate-700 pt-6 mb-6"
          aria-label="站点导航"
        >
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-300">
            <Link href="/" className="hover:text-white transition">首页</Link>
            <Link href="/questionnaire" className="hover:text-white transition">开始</Link>
            <Link href="/account" className="hover:text-white transition">我的账户</Link>
            <Link href="/affiliate" className="hover:text-white transition">博主计划</Link>
            <Link href="/about" className="hover:text-white transition">关于我们</Link>
            <a
              href={H5_SITE}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition inline-flex items-center gap-1"
              aria-label="移动端 H5 (在新标签页打开)"
            >
              移动端
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-label="外部链接"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </nav>

        {/* 法律声明 + AI 合规披露 */}
        <div className="border-t border-slate-700 pt-4">
          <p className="text-slate-400 text-xs text-center mb-3 leading-relaxed-cn">
            <strong>法律免责声明</strong>: 本平台仅提供文书模板化生成参考服务, 不构成任何法律专业意见。
            所有生成的文书仅供个人参考使用, 不具有法律函或法律咨询的效力。
            如需具有法律效力的文书或专业建议, 请咨询具有相应资质的<strong>专业资产规划人员</strong>或法律服务机构。
          </p>
          <p className="text-slate-400 text-xs text-center mb-3 leading-relaxed-cn">
            <strong>内容性质说明</strong>: 本站为婚姻 / 财产 / 抚养 / 赠与等家庭法律文书的模板化生成参考平台,
            仅供学习参考, 不构成专业法律或财务建议。
            使用本平台生成的任何文书, 您需自行核实其准确性和适用性, 并对使用结果承担全部责任。
          </p>
          <p className="text-slate-500 text-xs text-center leading-relaxed-cn">
            <a
              href="https://beian.miit.gov.cn"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 tabular-nums"
            >
              沪ICP备2026020925号-1
            </a>
            <span className="mx-2" aria-hidden>|</span>
            <Link href="/privacy" className="hover:text-slate-300">隐私政策</Link>
            <span className="mx-2" aria-hidden>|</span>
            <Link href="/terms" className="hover:text-slate-300">服务条款</Link>
            <span className="mx-2" aria-hidden>|</span>
            爱的延续工作室 · 上海市
            <span className="mx-2" aria-hidden>|</span>
            © 2026 爱的延续
          </p>
        </div>
      </div>
    </footer>
  );
}
