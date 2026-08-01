import Link from "next/link";
import WeChatFollow from "./WeChatFollow";
import { BrandLogo } from "./BrandLogo";

const MP_NAME = "家有所爱";
const MP_SEARCH_KEYWORD = "家有所爱";

/**
 * LegalFooter - 站点底部 (法律合规 + ICP 备案 + 公安备案 + 导航)
 *
 * 改版 v2 (2026-06-09, UI polish):
 *   - 添加 leading-tight-cn / leading-relaxed-cn 中文排版优化
 *   - 添加 aria-label / aria-hidden (外部链接图标)
 *   - 外链 SVG 加 role="img" + aria-label
 *   - 内部 nav 加 aria-label="站点导航"
 * 改版 v3 (2026-07-20, 红包机制):
 *   - 增加 /feedback + /wallet-policy 入口
 *   - 增加"红包激励"提示文案
 * 改版 v4 (2026-07-24, 业务铁律 v1.1):
 *   - 全站合规位置补 沪公网安备31011502406720号 (公安备案)
 *   - 增加 /custom 定制服务留言入口
 *   - 联系邮箱统一为 330320991@qq.com
 * 改版 v5 (2026-07-30, 事实陈述修正):
 *   - "存储于中国大陆腾讯云" → 改为"存储于 Supabase (海外节点)"
 *   - 因为数据层实为 Supabase (新加坡/美西), 与 Vercel 一致
 *   - 避免《广告法》第九条虚假宣传
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
            <Link href="/doc-type" className="hover:text-white transition">文书类型</Link>
            <Link href="/guide" className="hover:text-white transition">幸福指南</Link>
            <Link href="/account" className="hover:text-white transition">我的账户</Link>
            <Link href="/feedback" className="hover:text-white transition inline-flex items-center gap-1">
              问题反馈
              <span className="text-xs bg-amber-500 text-white px-1.5 rounded">奖</span>
            </Link>
            <Link href="/affiliate" className="hover:text-white transition">博主计划</Link>
            <Link href="/about" className="hover:text-white transition">关于我们</Link>
            <Link href="/methodology" className="hover:text-white transition">内容方法论</Link>
            <Link
              href="/contact"
              className="hover:text-white transition inline-flex items-center gap-1"
              aria-label="定制服务留言"
            >
              📮 定制服务留言
            </Link>
            <a
              href="https://h5.aiwill-planner.cn/doc-type"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition inline-flex items-center gap-1"
              aria-label="移动端 H5 文书类型 (在新标签页打开)"
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

        {/* 内容声明 + 合规披露 */}
        <div className="border-t border-slate-700 pt-4">
          <p className="text-slate-400 text-xs text-center mb-3 leading-relaxed-cn">
            <strong>内容性质说明</strong>: 本站为婚前 / 婚内 / 离婚 / 抚养 / 赠与 / 传承 6 类家庭场景的文书生成参考平台,
            所有内容由专业资产规划团队整理, 仅供学习参考。
            使用本平台生成的任何文书, 您需自行核实其适用性, 并对使用结果承担全部责任。
          </p>
          <p className="text-slate-400 text-xs text-center mb-3 leading-relaxed-cn">
            <strong>数据安全</strong>: 业务数据由 Supabase (PostgreSQL + RLS) 提供, PII 字段 AES-256 加密;
            静态站点部署于 Vercel CDN (海外节点) / 主域名 ICP 备案指向大陆 CNAME。
            涉及大额资产 / 复杂家庭关系, 建议咨询专业资产规划人员并办理公证。
          </p>
          <p className="text-slate-400 text-xs text-center mb-3 leading-relaxed-cn">
            联系：330320991@qq.com
          </p>
          {/* 管理员后台登录入口 (主站 footer) — robots.txt 已 Disallow /admin/ */}
          <p className="text-slate-500 text-xs text-center mb-3 leading-relaxed-cn">
            <Link
              href="/admin/login"
              className="hover:text-slate-300"
              aria-label="管理员后台登录"
            >
              🔒 管理员登录
            </Link>
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
            <a
              href="https://beian.mps.gov.cn"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 tabular-nums inline-flex items-center gap-1"
              aria-label="沪公网安备 31011502406720 号 (在新标签页打开)"
            >
              <svg
                className="w-3 h-3 inline-block"
                fill="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-label="公安备案图标"
              >
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
              </svg>
              沪公网安备 31011502406720 号
            </a>
            <span className="mx-2" aria-hidden>|</span>
            <Link href="/privacy" className="hover:text-slate-300">隐私政策</Link>
            <span className="mx-2" aria-hidden>|</span>
            <Link href="/terms" className="hover:text-slate-300">服务条款</Link>
            <span className="mx-2" aria-hidden>|</span>
            <Link href="/wallet-policy" className="hover:text-slate-300">红包规则</Link>
            <span className="mx-2" aria-hidden>|</span>
            家有所爱工作室 · 上海市
            <span className="mx-2" aria-hidden>|</span>
            © 2026 家有所爱
          </p>
        </div>
      </div>
    </footer>
  );
}
