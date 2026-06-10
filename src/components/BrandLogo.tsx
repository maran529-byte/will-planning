/**
 * BrandLogo — 统一的"爱的延续"品牌标识
 *
 * 改版 v7 (2026-06-09, 品牌重塑):
 *   - 来源: 用户提供的 WechatIMG233.jpg
 *   - 图像: 双手捧心 + 蓝白配色, 已去豆包 AI 水印
 *   - 旧版: <span aria-hidden>⚖️</span> + "爱的延续" 文字 (天平 emoji 太严肃, 不符品牌温度)
 *   - 新版: <img> logo.png + 可选文字
 *
 * 用法:
 *   <BrandLogo size="sm" />               // 仅 logo (32px), 用于 admin/sidebar
 *   <BrandLogo size="md" />               // logo (40px) + 文字, 用于页面 header
 *   <BrandLogo size="lg" showText={false} /> // 仅大 logo (96px), 用于 splash/og
 *
 * Server Component 安全 (纯 img, 不需要 client).
 */
import Image from "next/image";

export type BrandLogoSize = "sm" | "md" | "lg" | "xl";

interface BrandLogoProps {
  /** sm=32, md=40, lg=64, xl=96 (像素) */
  size?: BrandLogoSize;
  /** 是否显示"爱的延续"文字 (默认 md+ 显示) */
  showText?: boolean;
  /** 文字颜色 (默认继承父级 text-slate-800) */
  textClassName?: string;
  /** alt 文案, 默认 "爱的延续" */
  alt?: string;
  /** 额外 className 附加到外层 wrapper */
  className?: string;
}

const SIZE_PX: Record<BrandLogoSize, number> = {
  sm: 32,
  md: 40,
  lg: 64,
  xl: 96,
};

const TEXT_SIZE: Record<BrandLogoSize, string> = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl",
};

export function BrandLogo({
  size = "md",
  showText,
  textClassName,
  alt = "爱的延续",
  className = "",
}: BrandLogoProps) {
  const px = SIZE_PX[size];
  const textSize = TEXT_SIZE[size];
  // sm 默认不显示文字, md+ 默认显示
  const shouldShowText = showText ?? size !== "sm";

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <Image
        src="/logo.png"
        alt={alt}
        width={px}
        height={px}
        className="shrink-0"
        // logo 优先加载, header 视觉锚点
        priority={size === "md" || size === "lg"}
      />
      {shouldShowText && (
        <span
          className={`${textSize} font-bold ${textClassName ?? "text-slate-800"} leading-tight-cn`}
        >
          爱的延续
        </span>
      )}
    </div>
  );
}

export default BrandLogo;
