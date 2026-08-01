/**
 * 反馈关键词自动回复 (2026-07-24 · 业务铁律 v1.0)
 *
 * 流程:
 *   1. 用户提交反馈 (H5 /feedback)
 *   2. 服务端立即跑本函数匹配关键词
 *   3. 命中 → 1 分钟内自动回复 (短信/微信/邮件)
 *   4. 未命中 → 进 pending → feedback_optimizer 每日聚类
 *   5. 关键信息一律 redact.ts 模糊处理
 */

import { autoRedact, redactName, redactPhone, redactAmount } from './redact';

interface MatchedRule {
  keyword: string;
  reply_template: string;
  priority: number;
}

/**
 * 15+ 关键词内置库 (前端兜底, 真实匹配走 DB RPC match_feedback_keyword)
 * 优先级: 退款 (200) > 订单/进度 (150) > 价格/客服/红包 (100)
 */
export const FALLBACK_KEYWORDS: MatchedRule[] = [
  { keyword: '退款', reply_template: '您的退款申请已收到, 我们将在 1-3 个工作日内审核。\n\n订单号: {order_id}\n订单金额: {order_amount}\n\n如有疑问请联系客服微信: 家有所爱', priority: 200 },
  { keyword: '怎么退款', reply_template: '退款路径: 我的订单 → 选择订单 → 申请退款 → 填写理由。\n\n7 天内不满意全额退款, 无理由。', priority: 200 },
  { keyword: '订单状态', reply_template: '您的订单状态: {order_status}\n订单号: {order_id}\n预计完成: {eta}', priority: 150 },
  { keyword: '进度', reply_template: '您的文书正在处理中。当前进度: {progress}%。\n\n预计完成: {eta}', priority: 150 },
  { keyword: '发票', reply_template: '电子发票将在订单完成后 3 个工作日内自动开具。', priority: 100 },
  { keyword: '客服', reply_template: '客服微信: 家有所爱\n客服邮箱: 330320991@qq.com\n服务时间: 9:00-21:00', priority: 100 },
  { keyword: '微信', reply_template: '客服微信: 家有所爱\n添加后可查询订单 + 申请退款', priority: 100 },
  { keyword: '价格', reply_template: '本站所有文书统一 ¥19.9。\n定制服务请留言: h5.aiwill-planner.cn/custom', priority: 100 },
  { keyword: '多少钱', reply_template: '¥19.9 / 份。随机红包 2-10 元, 分享注册再得 ¥2。', priority: 100 },
  { keyword: '红包', reply_template: '红包自动发放: 问卷完成 / 订单支付 / 分享注册 / 反馈采纳。\n单个 ¥2-¥10 随机, 30 天有效。订单使用上限 50%。', priority: 100 },
  { keyword: '定制', reply_template: '定制服务请留言: h5.aiwill-planner.cn/custom\n24h 内回复: 330320991@qq.com', priority: 100 },
  { keyword: 'bug', reply_template: '感谢反馈!技术团队尽快查看。\n紧急 bug 请加客服微信', priority: 100 },
  { keyword: '打不开', reply_template: '请尝试: 1) 刷新 2) 切换网络 3) 清缓存\n仍不行请联系客服', priority: 100 },
  { keyword: '登录不上', reply_template: '登录排查: 1) 确认账号 2) 检查密码 3) 微信一键登录 4) 短信验证码', priority: 100 },
  { keyword: '收不到验证码', reply_template: '5 分钟内有效。检查: 信号/拦截/运营商\n可改用微信一键登录', priority: 100 },
];

/**
 * 本地匹配关键词
 */
export function matchLocalKeyword(text: string): MatchedRule | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const rule of FALLBACK_KEYWORDS) {
    if (lower.includes(rule.keyword.toLowerCase())) {
      return rule;
    }
  }
  return null;
}

/**
 * 填充模板 (变量已 redact)
 */
export interface ReplyContext {
  user_name?: string;
  order_id?: string;
  order_amount?: number;
  order_status?: string;
  paid_at?: string;
  eta?: string;
  progress?: number;
  page_url?: string;
  created_at?: string;
  order_url?: string;
  refund_url?: string;
  wallet_url?: string;
}

export function renderReply(template: string, ctx: ReplyContext = {}): string {
  let out = template;
  // 关键字段先打码, 再渲染
  const vars: Record<string, string> = {};
  if (ctx.user_name) vars.user_name = redactName(ctx.user_name);
  if (ctx.order_amount != null) vars.order_amount = redactAmount(ctx.order_amount);
  if (ctx.order_id) vars.order_id = ctx.order_id;
  if (ctx.order_status) vars.order_status = ctx.order_status;
  if (ctx.paid_at) vars.paid_at = ctx.paid_at;
  if (ctx.eta) vars.eta = ctx.eta;
  if (ctx.progress != null) vars.progress = String(ctx.progress);
  if (ctx.page_url) vars.page_url = ctx.page_url;
  if (ctx.created_at) vars.created_at = ctx.created_at;
  if (ctx.order_url) vars.order_url = ctx.order_url;
  if (ctx.refund_url) vars.refund_url = ctx.refund_url;
  if (ctx.wallet_url) vars.wallet_url = ctx.wallet_url;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{${k}}`, v);
  }
  // 最后再过一遍 autoRedact 兜底
  return autoRedact(out);
}

/**
 * 默认联系邮箱 (统一)
 */
export const CONTACT_EMAIL = '330320991@qq.com';

/**
 * 客服微信
 */
export const WECHAT_SERVICE = '家有所爱';
