'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

type Template = 'warm' | 'pro' | 'urgent';

interface Props {
  refCode: string;
  displayName: string;
  commissionRate: number; // basis points
}

const TEMPLATES: { id: Template; name: string; emoji: string; desc: string }[] = [
  {
    id: 'warm',
    name: '温馨版',
    emoji: '💝',
    desc: '柔和粉色, 家庭温情, 适合朋友圈',
  },
  {
    id: 'pro',
    name: '专业版',
    emoji: '⚖️',
    desc: '深蓝权威, 法律严谨, 适合公众号',
  },
  {
    id: 'urgent',
    name: '紧迫版',
    emoji: '⚠️',
    desc: '数据冲击, 紧迫感, 适合短视频',
  },
];

export default function PosterEditor({ refCode, displayName, commissionRate }: Props) {
  const [template, setTemplate] = useState<Template>('warm');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [siteUrl, setSiteUrl] = useState<string>('https://aiwill-planner.cn');
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 算站 URL (浏览器端用 location.origin, SSR fallback)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteUrl(window.location.origin);
    }
  }, []);

  // 生成 QR code data URL
  useEffect(() => {
    const refLink = `${siteUrl}/?ref=${refCode}`;
    QRCode.toDataURL(refLink, {
      width: 320,
      margin: 1,
      color: {
        dark: template === 'pro' ? '#1e3a8a' : template === 'urgent' ? '#dc2626' : '#92400e',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then(setQrDataUrl)
      .catch((err) => {
        console.error('QR code generation failed:', err);
      });
  }, [refCode, siteUrl, template]);

  // 渲染 canvas 用于下载
  const handleDownload = async () => {
    if (!canvasRef.current || !qrDataUrl) return;
    setDownloading(true);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      // 加载 QR 图
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => reject(new Error('QR image load failed'));
        qrImg.src = qrDataUrl;
      });

      // 模板配置
      const cfg = getTemplateConfig(template);

      // 画布尺寸 (9:16 竖版, 适合朋友圈/小红书/抖音)
      const W = 720;
      const H = 1280;
      canvas.width = W;
      canvas.height = H;

      // 背景
      ctx.fillStyle = cfg.bg;
      ctx.fillRect(0, 0, W, H);

      // 顶部装饰
      ctx.fillStyle = cfg.accent;
      ctx.fillRect(0, 0, W, 16);
      ctx.fillRect(0, H - 16, W, 16);

      // 标题
      ctx.fillStyle = cfg.title;
      ctx.font = 'bold 56px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cfg.titleText, W / 2, 110);

      // 副标题
      ctx.fillStyle = cfg.subtitle;
      ctx.font = '28px sans-serif';
      ctx.fillText(cfg.subtitleText, W / 2, 165);

      // 主视觉卡 (中部)
      const cardX = 60;
      const cardY = 220;
      const cardW = W - 120;
      const cardH = 600;
      ctx.fillStyle = cfg.cardBg;
      roundRect(ctx, cardX, cardY, cardW, cardH, 24);
      ctx.fill();

      // 卡内文案 (主卖点)
      ctx.fillStyle = cfg.title;
      ctx.font = 'bold 42px sans-serif';
      ctx.textAlign = 'center';

      // 多行文字处理
      const lines = cfg.mainLines;
      let lineY = cardY + 90;
      for (const line of lines) {
        ctx.fillText(line, W / 2, lineY);
        lineY += 60;
      }

      // 数据小点 (urgent 版)
      if (template === 'urgent' && cfg.stats) {
        lineY += 20;
        ctx.font = 'bold 36px sans-serif';
        ctx.fillStyle = '#dc2626';
        for (const stat of cfg.stats) {
          ctx.fillText(stat, W / 2, lineY);
          lineY += 50;
        }
      }

      // 底部装饰线
      ctx.strokeStyle = cfg.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cardX + 40, cardY + cardH - 80);
      ctx.lineTo(cardX + cardW - 40, cardY + cardH - 80);
      ctx.stroke();

      // 博主名 + 佣金
      ctx.fillStyle = cfg.subtitle;
      ctx.font = '22px sans-serif';
      ctx.fillText(`由 ${displayName} 推荐`, W / 2, cardY + cardH - 40);
      ctx.fillText(
        `推广码: ${refCode} · 佣金 ${(commissionRate / 100).toFixed(0)}%`,
        W / 2,
        cardY + cardH - 12
      );

      // QR 码 (底部位)
      const qrSize = 280;
      const qrX = (W - qrSize) / 2;
      const qrY = 880;

      // QR 背景
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 16);
      ctx.fill();
      ctx.strokeStyle = cfg.accent;
      ctx.lineWidth = 4;
      roundRect(ctx, qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 16);
      ctx.stroke();

      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // QR 下文案
      ctx.fillStyle = cfg.title;
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('长按 / 扫码 立享 ¥19.9 起', W / 2, qrY + qrSize + 50);

      // 底部 ICP
      ctx.fillStyle = cfg.subtitle;
      ctx.font = '18px sans-serif';
      ctx.fillText('家有所爱 · 沪ICP备2026020925号-1', W / 2, H - 40);

      // 触发下载
      const dataUrl = canvas.toDataURL('image/png', 0.95);
      const link = document.createElement('a');
      link.download = `aiwill-poster-${refCode}-${template}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
      alert('下载失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-6">
      {/* 左侧: 模板选择 + 操作 */}
      <div>
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">📐 选择模板</h3>
          <div className="space-y-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border-2 transition ${
                  template === t.id
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-slate-200 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{t.emoji}</span>
                  <div>
                    <div className="font-semibold text-sm text-slate-800">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-3">📥 下载</h3>
          <p className="text-xs text-slate-500 mb-3">
            生成 9:16 竖版 PNG, 适合朋友圈 / 小红书 / 抖音 / 视频号
          </p>
          <button
            onClick={handleDownload}
            disabled={downloading || !qrDataUrl}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white py-2.5 rounded-lg text-sm font-semibold"
          >
            {downloading ? '生成中...' : '💾 下载海报 PNG'}
          </button>
        </div>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
          <div className="font-semibold mb-1">💡 推广建议</div>
          <ul className="space-y-1 text-blue-800">
            <li>• 朋友圈: 温馨版 + 个人故事</li>
            <li>• 公众号: 专业版 + 详细数据</li>
            <li>• 短视频: 紧迫版 + 数字冲击</li>
            <li>• 配合您的个人二维码更佳</li>
          </ul>
        </div>
      </div>

      {/* 右侧: 实时预览 */}
      <div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-3">👀 实时预览</h3>

          {/* HTML 预览 (canvas 仅用于下载时绘制) */}
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex justify-center bg-slate-100 rounded-lg p-4">
            <div
              className="relative w-full max-w-[360px] shadow-lg rounded-2xl overflow-hidden"
              style={{
                background: getTemplateConfig(template).bg,
                aspectRatio: '9 / 16',
              }}
            >
              <div className="absolute inset-0 flex flex-col">
                <div
                  className="h-2"
                  style={{ background: getTemplateConfig(template).accent }}
                />
                <div className="text-center pt-6 px-4">
                  <h2
                    className="text-2xl font-bold leading-tight"
                    style={{ color: getTemplateConfig(template).title }}
                  >
                    {getTemplateConfig(template).titleText}
                  </h2>
                  <p
                    className="text-sm mt-2"
                    style={{ color: getTemplateConfig(template).subtitle }}
                  >
                    {getTemplateConfig(template).subtitleText}
                  </p>
                </div>

                <div
                  className="mx-4 mt-6 rounded-2xl p-4 flex-1"
                  style={{ background: getTemplateConfig(template).cardBg }}
                >
                  <div
                    className="text-center text-base font-bold leading-relaxed"
                    style={{ color: getTemplateConfig(template).title }}
                  >
                    {getTemplateConfig(template).mainLines.map((line, i) => (
                      <div key={i} className="my-1">
                        {line}
                      </div>
                    ))}
                  </div>

                  {template === 'urgent' && getTemplateConfig(template).stats && (
                    <div
                      className="text-center text-lg font-bold mt-3 space-y-1"
                      style={{ color: '#dc2626' }}
                    >
                      {getTemplateConfig(template).stats!.map((s, i) => (
                        <div key={i}>{s}</div>
                      ))}
                    </div>
                  )}

                  <div
                    className="mt-4 pt-3 text-center text-xs"
                    style={{ color: getTemplateConfig(template).subtitle }}
                  >
                    <div>由 {displayName} 推荐</div>
                    <div className="mt-1">
                      推广码 {refCode} · 佣金 {(commissionRate / 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center mt-4">
                  <div
                    className="bg-white rounded-xl p-2"
                    style={{ border: `3px solid ${getTemplateConfig(template).accent}` }}
                  >
                    {qrDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrDataUrl}
                        alt="QR Code"
                        className="w-32 h-32 block"
                      />
                    ) : (
                      <div className="w-32 h-32 flex items-center justify-center text-slate-300 text-xs">
                        生成中...
                      </div>
                    )}
                  </div>
                  <div
                    className="text-sm font-bold mt-2"
                    style={{ color: getTemplateConfig(template).title }}
                  >
                    长按 / 扫码 立享 ¥19.9 起
                  </div>
                </div>

                <div
                  className="text-center text-[10px] pb-2 mt-auto"
                  style={{ color: getTemplateConfig(template).subtitle }}
                >
                  家有所爱 · 沪ICP备2026020925号-1
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-3 text-center">
            提示: 实际下载的 PNG 由 canvas 渲染, 包含清晰二维码和高保真文字
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 模板配置
// =============================================================================

interface TemplateConfig {
  bg: string;
  cardBg: string;
  accent: string;
  title: string;
  subtitle: string;
  titleText: string;
  subtitleText: string;
  mainLines: string[];
  stats?: string[];
}

function getTemplateConfig(t: Template): TemplateConfig {
  if (t === 'warm') {
    return {
      bg: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)',
      cardBg: '#fff7ed',
      accent: '#f59e0b',
      title: '#7c2d12',
      subtitle: '#92400e',
      titleText: '把爱, 写进一份文书',
      subtitleText: '系统化生成 · 专业资产规划人员审核 · ¥19.9 起',
      mainLines: ['家有所爱', '让财富安心传承', '一份清晰的遗嘱', '是给家人最后的礼物'],
    };
  }
  if (t === 'pro') {
    return {
      bg: 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%)',
      cardBg: '#eff6ff',
      accent: '#1e3a8a',
      title: '#1e3a8a',
      subtitle: '#475569',
      titleText: '专业资产规划',
      subtitleText: '智能版 ¥19.9 · 复杂场景可留言定制服务',
      mainLines: ['合规 · 安全 · 私密', '5+ 年专业资产规划团队', '数据不出境', 'PII 字段加密存储'],
    };
  }
  // urgent
  return {
    bg: 'linear-gradient(180deg, #fef2f2 0%, #fee2e2 100%)',
    cardBg: '#fff1f2',
    accent: '#dc2626',
    title: '#991b1b',
    subtitle: '#7f1d1d',
    titleText: '60% 的人没立遗嘱',
    subtitleText: '意外从不提前通知 · 提前安排是对家人负责',
    mainLines: ['紧急但重要', '今天花 ¥19.9', '10 分钟生成', '给家人一个交代'],
    stats: ['60%', '从未立过遗嘱', '40%', '家庭因此产生纠纷'],
  };
}

// Canvas 圆角矩形辅助
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
