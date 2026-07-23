/**
 * /tool - host-aware 路由
 *
 * 主站 nginx: 由 static-content/tool.html 服务 (静态 SEO 页)
 * H5 next.js: 走本页面 - host 分流
 *
 * 架构 (2026-07-23):
 *   - 主站 host: 静态 SEO 介绍页 (实际 nginx 直出,本 Next.js 路由几乎不命中)
 *   - H5 host: 跳 H5 questionnaire 的智能工具页
 *
 * 修复: 之前 H5 上 /tool 返回 404, 现在统一跳 H5 questionnaire
 */

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { isH5Host } from '@/lib/host';

export const metadata: Metadata = {
  title: '智能文书工具 · 家有所爱',
  description: '通过简单的问卷, 帮您整理对家人的安排, 生成、支付和下载都在 H5 完成',
  alternates: {
    canonical: 'https://h5.aiwill-planner.cn/tool',
  },
  robots: {
    index: true,
    follow: true,
  },
};

interface PageProps {
  searchParams: {
    type?: string;
    plan?: string;
  };
}

export default async function ToolPage({ searchParams }: PageProps) {
  const host = (await headers()).get('host') ?? '';
  const isH5 = isH5Host(host);
  const docType = searchParams.type ?? 'will';
  const plan = searchParams.plan ?? 'ai';

  const h5Params = new URLSearchParams({ type: docType, plan });

  if (isH5) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-amber-600 transition">
              <BrandLogo size="sm" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4" aria-hidden="true">🛠️</div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2 leading-tight-cn">智能文书工具</h1>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed-cn">
              请在下方选择文书类型, 开始填写问卷。
            </p>

            <Link
              href={`https://h5.aiwill-planner.cn/questionnaire?${h5Params.toString()}`}
              className="block w-full py-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              立即开始生成 →
            </Link>

            <div className="mt-8 grid grid-cols-2 gap-3 text-left">
              {[
                { type: 'will', icon: '📜', label: '遗嘱' },
                { type: 'pre-marriage', icon: '💍', label: '婚前财产协议' },
                { type: 'during-marriage', icon: '🏠', label: '婚内财产协议' },
                { type: 'divorce', icon: '💔', label: '离婚协议' },
                { type: 'child-custody', icon: '👶', label: '抚养协议' },
                { type: 'gift', icon: '🎁', label: '赠与协议' },
              ].map((d) => (
                <Link
                  key={d.type}
                  href={`https://h5.aiwill-planner.cn/questionnaire?type=${d.type}&plan=${plan}`}
                  className="p-3 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50 transition text-sm"
                >
                  <span className="text-xl mr-1" aria-hidden="true">{d.icon}</span>
                  {d.label}
                </Link>
              ))}
            </div>

            <hr className="my-8" />

            <div className="text-xs text-slate-400 space-y-1">
              <p>遇到问题?</p>
              <p>
                微信搜 <span className="text-amber-500">家有所爱</span> 联系客服
              </p>
            </div>
          </div>

          <div className="mt-8 text-xs text-slate-400 text-center">
            家有所爱工作室 © 2026 · 沪ICP备2026020925号-1
          </div>
        </div>
      </div>
    );
  }

  // 主站 host: 静态介绍页 (实际 nginx 上由 static-content/tool.html 直出, 本页面兜底)
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-slate-900 mb-4">
          智能文书工具
        </h1>
        <p className="text-center text-slate-600 mb-12">
          通过简单的问卷，帮您整理对家人的安排，<strong>生成、支付和下载都在 H5 完成</strong>。
        </p>

        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4" aria-hidden="true">📋</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">立即生成您的文书 →</h2>
          <p className="text-slate-600 mb-6">
            为家人做一份心意规划，从填写问卷开始。
          </p>
          <Link
            href={`https://h5.aiwill-planner.cn/questionnaire?${h5Params.toString()}`}
            className="inline-block px-8 py-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            立即开始生成 →
          </Link>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-4 text-center text-sm text-slate-600">
          <div>
            <div className="text-2xl mb-2" aria-hidden="true">⏱️</div>
            <p>10 分钟完成问卷</p>
          </div>
          <div>
            <div className="text-2xl mb-2" aria-hidden="true">📝</div>
            <p>AI 生成专业文书草稿</p>
          </div>
          <div>
            <div className="text-2xl mb-2" aria-hidden="true">💎</div>
            <p>双格式下载 PDF + Word</p>
          </div>
        </div>

        <div className="mt-12 text-xs text-slate-400 text-center">
          家有所爱工作室 © 2026 · 沪ICP备2026020925号-1
        </div>
      </div>
    </div>
  );
}
