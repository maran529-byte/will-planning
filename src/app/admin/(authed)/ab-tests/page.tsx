import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { EXPERIMENTS } from '@/lib/ab-testing';

export const dynamic = 'force-dynamic';

interface VariantStats {
  variant: string;
  impressions: number;
  clicks: number;
  conversions: number;
  gmv_cents: number;
  ctr: number;        // clicks / impressions
  cvr: number;        // conversions / impressions
  ecpa_cents: number; // 每单成本 (GMV/conversions, 实际是反指标)
}

async function loadExperimentData(experimentName: string, sinceDays = 7) {
  if (!supabaseAdmin) return null;
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();

  // 拉所有事件
  const { data, error } = await supabaseAdmin
    .from('ab_events')
    .select('variant, event_type, value')
    .eq('experiment_name', experimentName)
    .gte('created_at', since);

  if (error) {
    console.error('loadExperimentData error:', error);
    return null;
  }

  // 按变体分组聚合
  const byVariant = new Map<string, VariantStats>();
  const cfg = EXPERIMENTS[experimentName];
  if (cfg) {
    for (const v of Object.keys(cfg.variants)) {
      byVariant.set(v, {
        variant: v,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        gmv_cents: 0,
        ctr: 0,
        cvr: 0,
        ecpa_cents: 0,
      });
    }
  }

  for (const ev of data || []) {
    const stats = byVariant.get(ev.variant);
    if (!stats) continue;
    if (ev.event_type === 'impression') stats.impressions += 1;
    else if (ev.event_type === 'click') stats.clicks += 1;
    else if (ev.event_type === 'conversion') {
      stats.conversions += 1;
      stats.gmv_cents += Number(ev.value) || 0;
    }
  }

  // 计算比例
  for (const stats of byVariant.values()) {
    stats.ctr = stats.impressions > 0 ? stats.clicks / stats.impressions : 0;
    stats.cvr = stats.impressions > 0 ? stats.conversions / stats.impressions : 0;
    stats.ecpa_cents = stats.conversions > 0 ? stats.gmv_cents / stats.conversions : 0;
  }

  // 总体
  const total = {
    impressions: 0,
    clicks: 0,
    conversions: 0,
    gmv_cents: 0,
  };
  for (const s of byVariant.values()) {
    total.impressions += s.impressions;
    total.clicks += s.clicks;
    total.conversions += s.conversions;
    total.gmv_cents += s.gmv_cents;
  }

  return {
    variants: Array.from(byVariant.values()),
    total,
    since_days: sinceDays,
  };
}

export default async function ABTestsPage() {
  const auth = await requireAdmin();
  if (!auth.authenticated) {
    return <div>无权访问</div>;
  }

  const experiments = Object.values(EXPERIMENTS);
  const dataList = await Promise.all(
    experiments.map(async (cfg) => ({
      config: cfg,
      data: await loadExperimentData(cfg.name, 7),
    }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-1">🧪 A/B 测试</h1>
        <p className="text-sm text-slate-600">
          过去 7 天的实验数据, 用于价格心理学和文案优化
        </p>
      </div>

      {dataList.map(({ config, data }) => (
        <ExperimentCard key={config.name} config={config} data={data} />
      ))}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
        <div className="font-semibold mb-2">📖 如何读 A/B 测试</div>
        <ul className="space-y-1 text-blue-800">
          <li>• <strong>CTR</strong> (click-through rate): 点击 / 曝光, 衡量 CTA 吸引力</li>
          <li>• <strong>CVR</strong> (conversion rate): 转化 / 曝光, 衡量付费转化能力</li>
          <li>• <strong>GMV</strong> (gross merchandise value): 总成交额, 衡量收入</li>
          <li>• 样本量 &lt; 100 时数据噪声大, 建议至少 500+ impressions 再下结论</li>
          <li>• CTR 显著差异 (p &lt; 0.05) 才算统计显著, 不能凭感觉判断</li>
        </ul>
      </div>
    </div>
  );
}

function ExperimentCard({
  config,
  data,
}: {
  config: typeof EXPERIMENTS[string];
  data: Awaited<ReturnType<typeof loadExperimentData>>;
}) {
  if (!data) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-1">{config.name}</h2>
        <p className="text-sm text-slate-500">暂无数据</p>
      </div>
    );
  }

  // 找最佳变体 (按 CVR)
  const bestVariant = data.variants.reduce(
    (best, v) => (v.cvr > best.cvr ? v : best),
    data.variants[0]
  );

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{config.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{config.description}</p>
          </div>
          <div className="text-xs text-slate-500">
            启动: {config.started_at}
          </div>
        </div>
      </div>

      <div className="p-5">
        {/* 汇总 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <SummaryCard label="总曝光" value={data.total.impressions.toLocaleString()} />
          <SummaryCard label="总点击" value={data.total.clicks.toLocaleString()} />
          <SummaryCard label="总转化" value={data.total.conversions.toLocaleString()} />
          <SummaryCard
            label="GMV"
            value={`¥${(data.total.gmv_cents / 100).toFixed(2)}`}
            accent="amber"
          />
        </div>

        {/* 变体对比表 */}
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 border-b">
            <tr>
              <th className="text-left py-2 px-2">变体</th>
              <th className="text-center py-2 px-2">权重</th>
              <th className="text-right py-2 px-2">曝光</th>
              <th className="text-right py-2 px-2">点击</th>
              <th className="text-right py-2 px-2">转化</th>
              <th className="text-right py-2 px-2">CTR</th>
              <th className="text-right py-2 px-2">CVR</th>
              <th className="text-right py-2 px-2">GMV</th>
            </tr>
          </thead>
          <tbody>
            {data.variants.map((v) => {
              const isBest = v.variant === bestVariant.variant && data.total.conversions > 0;
              return (
                <tr
                  key={v.variant}
                  className={`border-b border-slate-100 last:border-0 ${
                    isBest ? 'bg-emerald-50' : ''
                  }`}
                >
                  <td className="py-2 px-2 font-bold">
                    {v.variant}
                    {isBest && (
                      <span className="ml-1 text-xs text-emerald-600">👑</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center text-slate-500">
                    {config.variants[v.variant]}%
                  </td>
                  <td className="py-2 px-2 text-right">{v.impressions}</td>
                  <td className="py-2 px-2 text-right">{v.clicks}</td>
                  <td className="py-2 px-2 text-right">{v.conversions}</td>
                  <td className="py-2 px-2 text-right">
                    {(v.ctr * 100).toFixed(2)}%
                  </td>
                  <td className="py-2 px-2 text-right font-semibold">
                    {(v.cvr * 100).toFixed(2)}%
                  </td>
                  <td className="py-2 px-2 text-right text-amber-600">
                    ¥{(v.gmv_cents / 100).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {data.total.impressions < 100 && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
            ⏳ 样本量不足 ({data.total.impressions} / 推荐 500+), 结论仅供参考
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'amber' | 'emerald';
}) {
  const cls = accent === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200';
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <div className="text-xs text-slate-600 mb-1">{label}</div>
      <div className="text-lg font-bold text-slate-800">{value}</div>
    </div>
  );
}
