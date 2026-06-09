import { requireAdmin } from '@/lib/admin-auth';
import { formatYuanCompact, StatCard } from '@/lib/admin-helpers';
import {
  getDailyTrend,
  getFunnel,
  getPlanDistribution,
  getTopBloggers,
} from '@/lib/analytics';

/**
 * /admin/analytics 数据看板 V2
 *
 * 改版 v2 (2026-06-09):
 *   - 删除本地 formatYuan - 改用 @/lib/admin-helpers 的 formatYuanCompact
 *     (万元单位, 适合 dashboard 大数字)
 *   - 删除本地 SummaryCard - 改用共享的 <StatCard accent=...>
 *   - 装饰 emoji 加 <span aria-hidden>...</span>
 *   - 添加 leading-tight-cn / leading-relaxed-cn / tabular-nums
 *   - 标题 h1/h2 加 leading-tight-cn
 *   - 漏斗/套餐区加 role="status" + aria-label
 *   - 表格加 aria-label + <ol>/<li> 标记
 *   - 添加 pb-safe
 *
 * 包含: 4 张汇总卡 + 折线图 + 漏斗 + 套餐分布 + 头部博主
 *   - 折线图: 纯 SVG, 含 <title> tooltip (无 JS)
 *   - 漏斗图: 渐变宽度 (100% → 25%) + 端到端转化率
 *   - 套餐: 横向条形图 (相对最大值百分比)
 *   - 博主: 1/2/3 名金银铜背景色 + 渐进式背景
 */

export const dynamic = 'force-dynamic';

function formatDateLabel(date: string): string {
  // YYYY-MM-DD → MM/DD
  const parts = date.split('-');
  return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
}

export default async function AnalyticsPage() {
  const auth = await requireAdmin();
  if (!auth.authenticated) {
    return <div className="leading-relaxed-cn">无权访问</div>;
  }

  const [trend, funnel, plans, topBloggers] = await Promise.all([
    getDailyTrend(7),
    getFunnel(7),
    getPlanDistribution(30),
    getTopBloggers(30, 5),
  ]);

  // 计算汇总
  const totalGmv = trend.reduce((s, p) => s + p.gmv_cents, 0);
  const totalPaid = trend.reduce((s, p) => s + p.paid, 0);
  const totalOrders = trend.reduce((s, p) => s + p.orders, 0);
  const paidDays = trend.filter((p) => p.paid > 0).length;
  const avgGmv = paidDays > 0 ? totalGmv / paidDays : 0;

  return (
    <div className="space-y-6 pb-safe">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-1 leading-tight-cn">
          <span aria-hidden>📈 </span>数据看板 V2
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed-cn">
          过去 7 天业务趋势, 30 天套餐分布与博主排行
        </p>
      </div>

      {/* 4 汇总指标 */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
        role="group"
        aria-label="关键指标汇总"
      >
        <StatCard label="7 天 GMV" value={formatYuanCompact(totalGmv)} accent="emerald" />
        <StatCard
          label="7 天已支付"
          value={totalPaid.toLocaleString()}
          subValue="单"
          accent="blue"
        />
        <StatCard
          label="7 天创建订单"
          value={totalOrders.toLocaleString()}
          subValue="单"
        />
        <StatCard
          label="日均 GMV"
          value={formatYuanCompact(avgGmv)}
          subValue={`有销售天数 ${paidDays} 天`}
          accent="amber"
        />
      </div>

      {/* 折线图 */}
      <section
        className="bg-white rounded-xl p-5 shadow-sm"
        aria-labelledby="gmv-trend-h"
      >
        <h2 id="gmv-trend-h" className="text-lg font-bold text-slate-800 mb-4 leading-tight-cn">
          <span aria-hidden>📊 </span>7 天 GMV 趋势
        </h2>
        <GMVLineChart data={trend} />
      </section>

      {/* 漏斗 */}
      <section
        className="bg-white rounded-xl p-5 shadow-sm"
        aria-labelledby="funnel-h"
      >
        <h2 id="funnel-h" className="text-lg font-bold text-slate-800 mb-1 leading-tight-cn">
          <span aria-hidden>🔻 </span>转化漏斗
        </h2>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed-cn">
          从访问落地页到完成支付 (7 天)
        </p>
        <FunnelChart data={funnel} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 套餐分布 */}
        <section
          className="bg-white rounded-xl p-5 shadow-sm"
          aria-labelledby="plan-dist-h"
        >
          <h2 id="plan-dist-h" className="text-lg font-bold text-slate-800 mb-1 leading-tight-cn">
            <span aria-hidden>🎯 </span>套餐分布
          </h2>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed-cn">近 30 天已支付订单</p>
          {plans.length === 0 ? (
            <p
              className="text-center text-slate-400 text-sm py-8 leading-relaxed-cn"
              role="status"
              aria-label="暂无套餐数据"
            >
              暂无数据
            </p>
          ) : (
            <ul className="space-y-3" aria-label="套餐 GMV 分布">
              {plans.map((p) => {
                const maxGmv = Math.max(...plans.map((x) => x.gmv_cents));
                const pct = maxGmv > 0 ? (p.gmv_cents / maxGmv) * 100 : 0;
                return (
                  <li key={p.plan} className="leading-tight-cn">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">{p.plan}</span>
                      <span className="text-slate-500 tabular-nums">
                        {p.count.toLocaleString()} 单 · {formatYuanCompact(p.gmv_cents)}
                      </span>
                    </div>
                    <div
                      className="w-full bg-slate-100 rounded-full h-2 overflow-hidden"
                      role="progressbar"
                      aria-label={`${p.plan} 占比`}
                      aria-valuenow={Math.round(pct)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 头部博主 */}
        <section
          className="bg-white rounded-xl p-5 shadow-sm"
          aria-labelledby="top-bloggers-h"
        >
          <h2 id="top-bloggers-h" className="text-lg font-bold text-slate-800 mb-1 leading-tight-cn">
            <span aria-hidden>🏆 </span>头部博主
          </h2>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed-cn">近 30 天 GMV TOP 5</p>
          {topBloggers.length === 0 ? (
            <p
              className="text-center text-slate-400 text-sm py-8 leading-relaxed-cn"
              role="status"
              aria-label="暂无博主贡献"
            >
              暂无博主贡献
            </p>
          ) : (
            <ol className="space-y-2" aria-label="博主贡献排行">
              {topBloggers.map((b, i) => (
                <li
                  key={b.blogger_id}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50"
                >
                  <div
                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold tabular-nums ${
                      i === 0
                        ? 'bg-amber-100 text-amber-700'
                        : i === 1
                        ? 'bg-slate-200 text-slate-700'
                        : i === 2
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                    aria-label={`第 ${i + 1} 名`}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate leading-tight-cn">
                      {b.display_name}
                    </div>
                    <div className="text-xs text-slate-500 tabular-nums leading-relaxed-cn">
                      <code
                        className="font-mono text-amber-700"
                        aria-label={`推广码 ${b.ref_code}`}
                      >
                        {b.ref_code}
                      </code>
                      {' · '}
                      {b.clicks.toLocaleString()} 点击 / {b.conversions.toLocaleString()} 转化
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-amber-600 tabular-nums leading-tight-cn">
                      {formatYuanCompact(b.gmv_cents)}
                    </div>
                    <div className="text-xs text-slate-500 tabular-nums leading-relaxed-cn">
                      佣金 {formatYuanCompact(b.commission_cents)}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

// =============================================================================
// SVG 折线图
// =============================================================================

function GMVLineChart({ data }: { data: Awaited<ReturnType<typeof getDailyTrend>> }) {
  if (data.length === 0) {
    return (
      <p
        className="text-center text-slate-400 text-sm py-8 leading-relaxed-cn"
        role="status"
        aria-label="暂无 GMV 趋势数据"
      >
        暂无数据
      </p>
    );
  }

  const W = 800;
  const H = 240;
  const PADDING_L = 60;
  const PADDING_R = 20;
  const PADDING_T = 20;
  const PADDING_B = 40;
  const innerW = W - PADDING_L - PADDING_R;
  const innerH = H - PADDING_T - PADDING_B;

  const maxGmv = Math.max(...data.map((d) => d.gmv_cents), 1);
  const xStep = data.length > 1 ? innerW / (data.length - 1) : innerW;

  // Y 轴 5 个刻度
  const yTicks = 5;
  const yStep = maxGmv / yTicks;

  // 构造 path
  const points = data.map((d, i) => {
    const x = PADDING_L + i * xStep;
    const y = PADDING_T + innerH - (d.gmv_cents / maxGmv) * innerH;
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  // 区域填充
  const areaD =
    pathD +
    ` L ${points[points.length - 1].x} ${PADDING_T + innerH}` +
    ` L ${points[0].x} ${PADDING_T + innerH} Z`;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        style={{ maxWidth: '100%' }}
        role="img"
        aria-label="过去 7 天 GMV 趋势折线图"
      >
        <title>过去 7 天 GMV 趋势</title>

        {/* 网格线 + Y 轴刻度 */}
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const y = PADDING_T + (innerH / yTicks) * i;
          const value = maxGmv - yStep * i;
          return (
            <g key={i} aria-hidden="true">
              <line
                x1={PADDING_L}
                y1={y}
                x2={W - PADDING_R}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray={i === yTicks ? '0' : '2,3'}
              />
              <text
                x={PADDING_L - 8}
                y={y + 4}
                textAnchor="end"
                className="text-xs fill-slate-500"
                style={{ fontSize: '11px' }}
              >
                {formatYuanCompact(value)}
              </text>
            </g>
          );
        })}

        {/* 区域填充 */}
        <path d={areaD} fill="url(#amberGradient)" opacity="0.3" aria-hidden="true" />

        {/* 折线 */}
        <path
          d={pathD}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        />

        {/* 数据点 */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill="#fff"
              stroke="#f59e0b"
              strokeWidth="2"
            />
            {/* 悬停 tooltip - 用 title 元素 (浏览器原生) */}
            <title>
              {p.date}: {formatYuanCompact(p.gmv_cents)} ({p.paid} 单)
            </title>
          </g>
        ))}

        {/* X 轴标签 */}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={H - 12}
            textAnchor="middle"
            className="fill-slate-600"
            style={{ fontSize: '11px' }}
            aria-hidden="true"
          >
            {formatDateLabel(p.date)}
          </text>
        ))}

        {/* 定义渐变 */}
        <defs>
          <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// =============================================================================
// 漏斗图
// =============================================================================

function FunnelChart({ data }: { data: Awaited<ReturnType<typeof getFunnel>> }) {
  if (data.length === 0 || data[0].count === 0) {
    return (
      <p
        className="text-center text-slate-400 text-sm py-8 leading-relaxed-cn"
        role="status"
        aria-label="暂无漏斗数据"
      >
        暂无数据
      </p>
    );
  }

  const COLORS = ['bg-blue-500', 'bg-cyan-500', 'bg-amber-500', 'bg-emerald-500'];
  const top = data[0].count;
  const e2eRate = (data[data.length - 1].count / data[0].count) * 100;

  return (
    <div>
      <ul className="space-y-2" aria-label="转化漏斗">
        {data.map((step, i) => {
          const pct = top > 0 ? (step.count / top) * 100 : 0;
          // 漏斗宽度: 100% → 75% → 50% → 25% (线性缩减)
          const visualWidth = 100 - i * 15;
          return (
            <li key={step.step} className="flex items-center gap-3">
              <div className="w-20 text-sm text-slate-600 text-right flex-shrink-0 leading-tight-cn">
                {step.step}
              </div>
              <div className="flex-1 flex justify-center">
                <div
                  className={`${COLORS[i] || 'bg-slate-400'} rounded-lg text-white text-sm py-2 px-4 font-semibold transition-all tabular-nums`}
                  style={{ width: `${visualWidth}%`, minWidth: '120px' }}
                  role="meter"
                  aria-label={`${step.step} ${step.count.toLocaleString()} 次, 占比 ${pct.toFixed(1)}%`}
                  aria-valuenow={Math.round(pct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  {step.count.toLocaleString()}
                </div>
              </div>
              <div className="w-20 text-sm text-slate-700 text-left flex-shrink-0 font-mono tabular-nums leading-tight-cn">
                {(step.rate * 100).toFixed(1)}%
              </div>
            </li>
          );
        })}
      </ul>

      {data.length >= 2 && data[0].count > 0 && (
        <div
          className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 leading-relaxed-cn"
          role="status"
          aria-label="端到端转化率"
        >
          <span aria-hidden>💡 </span>端到端转化率:{' '}
          <strong className="text-emerald-600 tabular-nums">{e2eRate.toFixed(2)}%</strong>
          (访问 → 支付)
        </div>
      )}
    </div>
  );
}
