import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getOpenidFromCookie } from "@/lib/cookie";
import { getSupabaseUserIdFromOpenid } from "@/lib/user-mapping";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isH5Host } from "@/lib/host";
import { calcAvailableCents, RedPacket } from "@/lib/red_packet";
import { TransferPanel } from "./TransferSection/TransferPanel";

/**
 * /wallet-policy - 红包/余额使用规则说明页
 *
 * 改版 v1 (2026-07-20):
 *   - 用户提交问题前必须能访问此页了解规则
 *   - 用户支付前也通过此页理解红包使用范围
 *   - 5 个明确条款: 仅限服务费/不可提现/不可转赠/有效期/无现金价值
 *
 * 改版 v2 (2026-07-24, 业务铁律 v1.1):
 *   - 第 3 条改为"可转赠 (PIN 验证)" — A 自定义金额, ≤ A 账户剩余红包
 *   - 增加 5 个新规则: 24h 撤销 / 日上限 / PIN 锁定 / 审计 / 退号处理
 *   - 增加转赠操作区入口 (客户端组件 TransferPanel)
 *   - H5 域加载: 登录态 + 可用红包 + 当日已转赠
 */

export const metadata: Metadata = {
  title: "红包使用规则 · 余额规则说明",
  description:
    "家有所爱 · 用户反馈红包激励使用规则说明。红包仅限站内服务费抵用, 不可提现, 可通过 PIN 验证转赠, 不可兑换现金。",
  robots: "index, follow",
};

export default async function WalletPolicyPage() {
  const host = (await headers()).get("host") ?? "";
  const isH5 = isH5Host(host);

  // H5 域: 加载用户上下文
  let isLoggedIn = false;
  let userId: string | null = null;
  let availableCents = 0;
  let dailyTransferredCents = 0;
  let hasPinSet = false;

  if (isH5) {
    const openid = await getOpenidFromCookie();
    if (openid && supabaseAdmin) {
      userId = await getSupabaseUserIdFromOpenid(openid).catch(() => null);
      if (userId) {
        isLoggedIn = true;
        // 查可用红包
        const { data: packets } = await supabaseAdmin
          .from("red_packets")
          .select("id, user_id, amount_cents, trigger, status, used_amount_cents, issued_at, expires_at, used_at")
          .eq("user_id", userId)
          .eq("status", "issued");
        availableCents = calcAvailableCents((packets ?? []) as RedPacket[]);
        // 查用户 PIN 状态
        const { data: userRow } = await supabaseAdmin
          .from("users")
          .select("pin_hash")
          .eq("id", userId)
          .single();
        hasPinSet = !!userRow?.pin_hash;
        // 查当日累计转赠
        const today = new Date().toISOString().slice(0, 10);
        const { data: todayTransfers } = await supabaseAdmin
          .from("red_packet_transfers")
          .select("amount_cents")
          .eq("from_user_id", userId)
          .is("revoked_at", null)
          .gte("created_at", `${today}T00:00:00Z`);
        dailyTransferredCents = (todayTransfers ?? []).reduce(
          (s, t) => s + (t.amount_cents ?? 0),
          0
        );
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="text-center space-y-3">
          <div className="inline-block bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-full">
            📜 用户规则 · 红包使用
          </div>
          <h1 className="text-3xl font-bold text-slate-800">
            红包 & 余额使用规则
          </h1>
          <p className="text-sm text-slate-500">
            最后更新: 2026-07-20 · 生效日期: 2026-07-20
          </p>
        </header>

        {/* 5 条核心规则 (一图读懂) */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <span aria-hidden>🎯</span> 5 条核心规则
          </h2>
          <ol className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                1
              </span>
              <div>
                <b>仅限服务费抵用</b>
                <p className="text-slate-600 mt-1">
                  红包只能在 <Link href="/payment" className="text-amber-600 underline">下单支付</Link> 时抵用 ¥X 的服务费, 自动从订单金额中扣除。
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                2
              </span>
              <div>
                <b>不可提现</b>
                <p className="text-slate-600 mt-1">
                  任何情况下, 余额都<b>不能提现</b>到银行卡/微信/支付宝。
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                3
              </span>
              <div>
                <b>可转赠 (PIN 验证 · v1.1 新增)</b>
                <p className="text-slate-600 mt-1">
                  用户可将本人账户内可用红包<b>转赠给其他已注册用户</b>。单次转赠金额 ¥2 ~ ¥10 由转赠方自定义,
                  但<b>不得超过本人账户剩余可用红包总额</b>;需输入 <b>6 位数字 PIN</b> 二次确认,
                  错误 5 次锁定 1 小时。详见 <a href="#transfer-rules" className="text-amber-600 underline">§7 转赠规则</a>。
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                4
              </span>
              <div>
                <b>有效期 180 天</b>
                <p className="text-slate-600 mt-1">
                  每笔红包自发放之日起 <b>180 天</b>有效, 过期未用部分自动清零, 不补发。
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                5
              </span>
              <div>
                <b>无现金价值</b>
                <p className="text-slate-600 mt-1">
                  余额不构成对家有所爱工作室的债权, 不享有现金价值, 不参与任何形式的兑付。
                </p>
              </div>
            </li>
          </ol>
        </section>

        {/* 详细条款 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5 text-sm leading-relaxed">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <span aria-hidden>📋</span> 详细说明
          </h2>

          <div>
            <h3 className="font-semibold text-slate-800 mb-2">§ 1 · 红包来源</h3>
            <p className="text-slate-600">
              红包由家有所爱工作室通过以下两种方式向用户发放:
            </p>
            <ul className="list-disc list-inside text-slate-600 mt-2 space-y-1 ml-4">
              <li>
                <b>人工发放</b>: 用户通过 <Link href="/feedback" className="text-amber-600 underline">/feedback</Link> 提交有效问题, 经管理员审核采纳后, 由管理员在后台手动发放 ¥1 ~ ¥50 红包;
              </li>
              <li>
                <b>自动发放</b>: 自运营巡检脚本每日扫描用户提交的问题, 对照已知问题库匹配, 命中后自动确认并发放系统红包 (¥3 ~ ¥20)。
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-800 mb-2">§ 2 · 使用范围</h3>
            <p className="text-slate-600">
              红包余额仅能在 <b>家有所爱官方平台</b>(包括 PC 站 aiwill-planner.cn、H5 站 h5.aiwill-planner.cn、未来官方小程序及公众号内嵌页) 进行以下消费时抵用:
            </p>
            <ul className="list-disc list-inside text-slate-600 mt-2 space-y-1 ml-4">
              <li>婚前财产协议、婚内财产协议、离婚协议、子女抚养协议、赠与协议、遗嘱/传承等 6 类家庭法律文书服务费;</li>
              <li>由家有所爱工作室自营的专业人士陪伴、法律咨询增值服务费。</li>
            </ul>
            <p className="text-slate-600 mt-2">
              <b>不适用范围</b>: 律师/法务对接费用中的实付律师费代收代付部分、发票服务费、跨境认证代办费。
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-800 mb-2">§ 3 · 抵用规则</h3>
            <ul className="list-disc list-inside text-slate-600 space-y-1 ml-4">
              <li>单笔订单可使用余额的 <b>0% ~ 100%</b> 进行抵用 (由用户在支付时自行选择);</li>
              <li>若订单金额 &lt; 可用余额, 多余部分 <b>不找零</b>, 余额继续留存至下次使用;</li>
              <li>支付完成后, 若发生订单退款, 已使用的红包金额 <b>原路退回</b>到用户余额 (新有效期 180 天);</li>
              <li>红包不可与折扣码、限时优惠同享 (系统自动选择最大优惠)。</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-800 mb-2">§ 4 · 过期与失效</h3>
            <ul className="list-disc list-inside text-slate-600 space-y-1 ml-4">
              <li>每笔红包有独立的发放时间和 180 天有效期;</li>
              <li>系统每日 03:00 自动扫描, 将过期红包标记为已失效并扣减余额;</li>
              <li>用户可在 <Link href="/account/wallet" className="text-amber-600 underline">/account/wallet</Link> 查看余额构成 (按过期时间排序)。</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-800 mb-2">§ 5 · 撤销与封禁</h3>
            <p className="text-slate-600">
              如发现用户通过<b>虚假问题、伪造截图、恶意刷单</b>等方式套取红包, 家有所爱工作室有权:
            </p>
            <ul className="list-disc list-inside text-slate-600 mt-2 space-y-1 ml-4">
              <li>撤销已发放红包并清零余额;</li>
              <li>封禁相关账号的提单、评论、社区功能;</li>
              <li>必要时追究法律责任。</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-800 mb-2">§ 6 · 规则变更</h3>
            <p className="text-slate-600">
              本规则由家有所爱工作室制定并解释。规则更新将在本页面公布, 重大变更将通过站内通知或微信公众号&ldquo;家有所爱&rdquo;推送告知。规则变更对已发放红包的效力:
            </p>
            <ul className="list-disc list-inside text-slate-600 mt-2 space-y-1 ml-4">
              <li>已发放但未使用的红包, 适用发放时生效的规则;</li>
              <li>新发放的红包适用最新规则。</li>
            </ul>
          </div>

          <div id="transfer-rules">
            <h3 className="font-semibold text-slate-800 mb-2">§ 7 · 转赠规则 (v1.1 新增 · 2026-07-24 生效)</h3>
            <p className="text-slate-600">
              转赠是用户 A 将自己账户内的红包余额转移给用户 B 的功能, 旨在让红包更灵活地在熟人之间流通。
              转赠受严格的风控约束, 任何疑似洗钱、刷单、套现行为都将被拒绝并上报。
            </p>

            <h4 className="font-medium text-slate-700 mt-3 mb-1 text-sm">7.1 金额规则</h4>
            <ul className="list-disc list-inside text-slate-600 space-y-1 ml-4 text-sm">
              <li>单次转赠金额由 A 自定义, 范围 <b>¥2 ~ ¥10</b> (200 ~ 1000 分, 与红包发行区间一致);</li>
              <li>单次转赠金额<b>不得超过 A 账户当前剩余可用红包总额</b> (硬约束, 系统强校验);</li>
              <li>单用户<b>每日转赠次数 ≤ 3 次</b>, 每日转赠累计金额 <b>≤ ¥30</b>;</li>
              <li>不能转给自己 (系统拒绝)。</li>
            </ul>

            <h4 className="font-medium text-slate-700 mt-3 mb-1 text-sm">7.2 验证方式</h4>
            <ul className="list-disc list-inside text-slate-600 space-y-1 ml-4 text-sm">
              <li>必须先在 <code className="bg-slate-100 px-1 rounded">/wallet-policy</code> 页面设置 <b>6 位数字 PIN</b>;</li>
              <li>每次转赠 / 撤销都需输入 PIN 二次确认;</li>
              <li>PIN 错误 <b>5 次</b> 自动锁定账户 <b>1 小时</b> (期间无法转赠);</li>
              <li>PIN 不得为 <code>123456</code> / <code>654321</code> / 6 位重复数字等弱密码;</li>
              <li>PIN 以 SHA-256 单向哈希存储, 不可逆, 不可读取 (遗忘需联系客服重置)。</li>
            </ul>

            <h4 className="font-medium text-slate-700 mt-3 mb-1 text-sm">7.3 有效期与使用限制</h4>
            <ul className="list-disc list-inside text-slate-600 space-y-1 ml-4 text-sm">
              <li>接收方 B 的红包从转赠成功起重新计算 <b>30 天</b>有效期 (不继承 A 原红包的过期时间);</li>
              <li>转赠后红包的使用限制与原红包一致: 单笔订单 ≤ 50%;</li>
              <li>使用顺序: A → B 红包按各自过期时间 FIFO 扣减, 过期时间近的优先使用。</li>
            </ul>

            <h4 className="font-medium text-slate-700 mt-3 mb-1 text-sm">7.4 撤销规则 (24 小时窗口)</h4>
            <ul className="list-disc list-inside text-slate-600 space-y-1 ml-4 text-sm">
              <li>A 在转赠成功后 <b>24 小时内</b>可发起撤销, 需输入 PIN;</li>
              <li>撤销条件: B 的红包<b>未被使用</b> (包括未被部分使用);</li>
              <li>撤销后: B 的红包状态置为 <code>voided</code>; A 账户收到一份等额新红包 (trigger=<code>admin_grant</code>), 有效期重新计算 30 天;</li>
              <li>超过 24 小时或 B 已使用, 一律不可撤销;</li>
              <li>所有撤销行为均写入 <code>red_packet_transfers</code> 审计日志。</li>
            </ul>

            <h4 className="font-medium text-slate-700 mt-3 mb-1 text-sm">7.5 风控与审计</h4>
            <ul className="list-disc list-inside text-slate-600 space-y-1 ml-4 text-sm">
              <li>每次转赠永久留痕: from / to / 金额 / IP / User-Agent / 扣减明细;</li>
              <li>风控规则: A→B→A 回环 (24h 内)、同一设备多账号转赠、短期内高频转赠 → 自动拒绝并报警;</li>
              <li>工作室保留对异常转赠进行<b>人工审核、撤销、封号</b>的权利;</li>
              <li>涉及大额或可疑转赠, 工作室可能要求提供双方关系证明。</li>
            </ul>
          </div>
        </section>

        {/* 客服联系 */}
        <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-3">
          <h3 className="font-semibold text-slate-800">有疑问?</h3>
          <p className="text-sm text-slate-600">
            如对余额规则有任何疑问, 可通过以下方式联系我们:
          </p>
          <div className="flex justify-center gap-4 text-sm">
            <Link href="/feedback" className="text-amber-600 underline">
              提交新反馈
            </Link>
            <span className="text-slate-300">·</span>
            <span className="text-slate-600">微信公众号: 家有所爱</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-600">联系邮箱: 330320991@qq.com</span>
          </div>
        </section>

        {/* 转赠操作区 (H5 域 + 已登录) */}
        {isH5 && (
          <section className="space-y-4">
            <header className="text-center space-y-2">
              <div className="inline-block bg-rose-100 text-rose-800 text-xs px-3 py-1 rounded-full">
                🎁 转赠红包 · 业务铁律 v1.1
              </div>
              <h2 className="text-xl font-bold text-slate-800">红包转赠中心</h2>
              <p className="text-xs text-slate-500">
                将您的红包余额转赠给家人朋友, 30 天内有效, 24 小时内可撤销
              </p>
            </header>
            <TransferPanel
              userId={userId ?? ""}
              availableCents={availableCents}
              dailyTransferredCents={dailyTransferredCents}
              isLoggedIn={isLoggedIn}
              hasPinSet={hasPinSet}
            />
          </section>
        )}

        <p className="text-center text-xs text-slate-400">
          本规则依据《民法典》第 127 条 (数据与网络虚拟财产保护) 及《消费者权益保护法》制定
        </p>
      </div>
    </div>
  );
}
