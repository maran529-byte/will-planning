/**
 * /affiliate - 博主计划公开页.
 *
 * 改版 v2 (2026-06-08, Phase B):
 *   - 鉴权改用 user_session cookie (统一用户体系)
 *   - "请先登录" 链接指向 /login (不是 /admin/login)
 *   - 已申请博主 → 显示申请状态 (pending/approved/rejected/disabled)
 *   - 已登录但未申请 → 显示申请表单
 *   - 未登录 → 引导去登录
 *
 * 改版 v3 (2026-06-09, UI polish):
 *   - 添加 leading-tight-cn / leading-relaxed-cn / tabular-nums 排版
 *   - 添加 role="status" / aria-label / aria-hidden
 *   - 添加 pb-safe (iOS 底部安全区)
 *   - 状态徽章 status role
 *
 * 包含:
 *  - 计划介绍 (佣金比例, 结算规则, T+7 防退款)
 *  - 申请表单 (姓名/手机/简介, 需登录)
 *  - 当前申请状态 (如已申请)
 */
import { requireUser } from '@/lib/user-auth';
import { getBloggerByUserId } from '@/lib/affiliate';
import { ApplyForm } from './ApplyForm';

export const dynamic = 'force-dynamic';

export default async function AffiliatePage() {
  const auth = await requireUser();
  const user = auth.authenticated && auth.user
    ? { id: auth.user.id, email: auth.user.email, role: auth.user.role }
    : null;
  let existingBlogger = null;

  if (user?.id) {
    existingBlogger = await getBloggerByUserId(user.id);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-safe">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        {/* 标题区 */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-3 leading-tight-cn text-balance">
            <span aria-hidden>🎁 </span>家有所爱 · 博主推广计划
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed-cn">
            分享有温度的资产规划服务, 获得长期被动收入
          </p>
        </div>

        {/* 收益概览 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div
            className="bg-white rounded-xl p-5 shadow-sm border border-amber-100"
            role="status"
            aria-label="基础佣金比例 10%"
          >
            <div className="text-3xl font-bold text-amber-600 tabular-nums">10%</div>
            <div className="text-sm text-slate-600 mt-1 leading-tight-cn">基础佣金比例</div>
            <div className="text-xs text-slate-400 mt-2 leading-relaxed-cn">
              专家套餐 ¥999 → 返 ¥99.9
            </div>
          </div>
          <div
            className="bg-white rounded-xl p-5 shadow-sm border border-amber-100"
            role="status"
            aria-label="高单价套餐佣金 15%"
          >
            <div className="text-3xl font-bold text-amber-600 tabular-nums">15%</div>
            <div className="text-sm text-slate-600 mt-1 leading-tight-cn">高单价套餐佣金</div>
            <div className="text-xs text-slate-400 mt-2 leading-relaxed-cn">
              专业套餐 ¥4699 → 返 ¥704.85
            </div>
          </div>
          <div
            className="bg-white rounded-xl p-5 shadow-sm border border-amber-100"
            role="status"
            aria-label="结算周期 T+7"
          >
            <div className="text-3xl font-bold text-amber-600">T+7</div>
            <div className="text-sm text-slate-600 mt-1 leading-tight-cn">结算周期</div>
            <div className="text-xs text-slate-400 mt-2 leading-relaxed-cn">
              支付后 7 天变可提现
            </div>
          </div>
        </div>

        {/* 流程介绍 */}
        <section
          className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm mb-10"
          aria-label="结算规则详情"
        >
          <h2 className="text-xl font-bold text-slate-800 mb-5 leading-tight-cn">
            <span aria-hidden>📋 </span>结算规则
          </h2>
          <ol className="space-y-3 text-sm sm:text-base text-slate-700 leading-relaxed-cn">
            <li className="flex gap-3">
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold"
                aria-hidden
              >1</span>
              <span>
                <strong>佣金计算</strong>: 用户通过您的专属链接
                <code className="px-1.5 py-0.5 mx-1 rounded bg-slate-100 text-xs break-all">
                  aiwill-planner.cn/?ref=您的推广码
                </code>
                进入, 30 天内下单均算您的推广业绩.
              </span>
            </li>
            <li className="flex gap-3">
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold"
                aria-hidden
              >2</span>
              <span>
                <strong>订单支付后</strong>: 系统自动写入佣金, 状态为
                <code className="px-1.5 py-0.5 mx-1 rounded bg-slate-100 text-xs">pending</code>
                (7 天防退款期).
              </span>
            </li>
            <li className="flex gap-3">
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold"
                aria-hidden
              >3</span>
              <span>
                <strong>7 天后</strong>: 订单未退款, 佣金自动变为
                <code className="px-1.5 py-0.5 mx-1 rounded bg-slate-100 text-xs">available</code>
                (可提现).
              </span>
            </li>
            <li className="flex gap-3">
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold"
                aria-hidden
              >4</span>
              <span>
                <strong>最低提现 ¥10</strong>, 支付宝/微信/银行卡均可, 1-3 个工作日到账.
              </span>
            </li>
            <li className="flex gap-3">
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold"
                aria-hidden
              >5</span>
              <span>
                <strong>违规处理</strong>: 刷量 / 自买自卖 / 恶意退款, 一经查实永久封禁并扣除所有未提现佣金.
              </span>
            </li>
          </ol>
        </section>

        {/* 申请表单 / 当前状态 */}
        {existingBlogger ? (
          <ExistingBloggerStatus blogger={existingBlogger} />
        ) : user ? (
          <ApplyForm />
        ) : (
          <div
            className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center"
            role="status"
            aria-label="未登录状态"
          >
            <p className="text-amber-900 mb-2 font-medium leading-tight-cn">请先登录</p>
            <p className="text-sm text-amber-700 mb-4 leading-relaxed-cn">
              您需要登录后才能申请成为博主 (没有账号可免费注册)
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <a
                href="/login?return=/affiliate"
                className="inline-block bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg text-sm font-medium"
              >
                前往登录
              </a>
              <a
                href="/register?return=/affiliate"
                className="inline-block bg-white border border-amber-300 hover:border-amber-400 text-amber-700 px-6 py-2 rounded-lg text-sm font-medium"
              >
                免费注册
              </a>
            </div>
          </div>
        )}

        {/* 客服 */}
        <div className="mt-10 text-center text-sm text-slate-500 leading-relaxed-cn">
          有疑问? 微信联系客服 <span className="font-mono text-slate-700 tabular-nums">wxid_xxx</span>
          {' '}(或邮件{' '}
          <a
            href="mailto:affiliate@aiwill-planner.cn"
            className="text-amber-600 hover:text-amber-700 underline"
          >
            affiliate@aiwill-planner.cn
          </a>
          )
        </div>
      </div>
    </div>
  );
}

function ExistingBloggerStatus({ blogger }: { blogger: NonNullable<Awaited<ReturnType<typeof getBloggerByUserId>>> }) {
  const statusMap = {
    pending: { label: '⏳ 待审核', cls: 'bg-amber-100 text-amber-800', desc: '我们会在 1-2 个工作日内审核您的申请' },
    approved: { label: '✅ 已通过', cls: 'bg-emerald-100 text-emerald-800', desc: '您可以开始推广' },
    rejected: { label: '❌ 已拒绝', cls: 'bg-red-100 text-red-800', desc: '详情见审核备注' },
    disabled: { label: '🚫 已禁用', cls: 'bg-slate-200 text-slate-700', desc: '账号已被禁用' },
  };
  const s = statusMap[blogger.status];

  return (
    <section
      className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm"
      aria-label="我的博主申请"
    >
      <h2 className="text-xl font-bold text-slate-800 mb-4 leading-tight-cn">
        <span aria-hidden>📝 </span>我的申请
      </h2>

      <div
        className={`rounded-lg p-4 ${s.cls} mb-4`}
        role="status"
        aria-label={`申请状态: ${s.label}`}
      >
        <div className="font-semibold text-lg mb-1 leading-tight-cn">{s.label}</div>
        <div className="text-sm leading-relaxed-cn">{s.desc}</div>
      </div>

      <dl className="space-y-3 text-sm leading-relaxed-cn">
        <div className="flex gap-2">
          <dt className="text-slate-500 min-w-[80px]">显示名</dt>
          <dd className="text-slate-800">{blogger.display_name || '-'}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-slate-500 min-w-[80px]">联系手机</dt>
          <dd className="font-mono text-slate-800 tabular-nums">{blogger.contact_phone || '-'}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-slate-500 min-w-[80px]">简介</dt>
          <dd className="text-slate-800">{blogger.bio || '-'}</dd>
        </div>
        {blogger.ref_code && (
          <div className="flex gap-2 items-center bg-amber-50 -mx-2 px-3 py-2 rounded">
            <dt className="text-amber-700 min-w-[80px] font-medium">推广码</dt>
            <dd>
              <code
                className="font-mono font-bold text-amber-900 text-base tabular-nums"
                aria-label={`推广码: ${blogger.ref_code}`}
              >
                {blogger.ref_code}
              </code>
            </dd>
          </div>
        )}
        {blogger.commission_rate && (
          <div className="flex gap-2">
            <dt className="text-slate-500 min-w-[80px]">佣金比例</dt>
            <dd className="text-slate-800 tabular-nums">
              {(blogger.commission_rate / 100).toFixed(1)}%
            </dd>
          </div>
        )}
        {blogger.review_note && (
          <div className="flex gap-2">
            <dt className="text-slate-500 min-w-[80px]">审核备注</dt>
            <dd className="text-slate-800">{blogger.review_note}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="text-slate-500 min-w-[80px]">申请时间</dt>
          <dd className="text-slate-600 text-xs tabular-nums">
            {new Date(blogger.applied_at).toLocaleString('zh-CN')}
          </dd>
        </div>
      </dl>

      {blogger.status === 'approved' && blogger.ref_code && (
        <div className="mt-6">
          <a
            href="/affiliate/dashboard"
            className="block w-full text-center bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-lg font-medium"
          >
            <span aria-hidden>📊 </span>进入博主工作台
          </a>
        </div>
      )}
    </section>
  );
}
