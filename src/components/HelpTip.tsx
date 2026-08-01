"use client";

import { useState, useRef, useEffect } from "react";

interface HelpTipProps {
  title: string;
  content: string;
  size?: "sm" | "md";
  align?: "top" | "bottom";
  className?: string;
}

// 通用帮助提示气泡组件
// - 点击 ❓ 展开/收起
// - 点击外部自动收起
// - 移动端可点, 桌面 hover 也能用 (focus 触发)
export function HelpTip({ title, content, size = "sm", align = "bottom", className = "" }: HelpTipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const buttonSize = size === "sm" ? "w-4 h-4 text-[10px]" : "w-5 h-5 text-xs";
  const popoverWidth = "w-72 max-w-[calc(100vw-2rem)]";
  const popoverAlign = align === "top" ? "bottom-full mb-2" : "top-full mt-2";

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label={`帮助: ${title}`}
        className={`${buttonSize} inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-amber-100 hover:text-amber-700 active:bg-amber-200 transition flex-shrink-0 select-none`}
      >
        <span aria-hidden className="font-bold leading-none">?</span>
      </button>
      {open && (
        <div
          role="tooltip"
          className={`absolute left-0 z-50 ${popoverAlign} ${popoverWidth} bg-slate-900 text-white text-sm rounded-xl p-3.5 shadow-xl leading-relaxed-cn animate-in fade-in zoom-in-95`}
          style={{ animationDuration: "120ms" }}
        >
          <div className="font-semibold mb-1.5 text-amber-300 text-[13px] flex items-center gap-1.5">
            <span aria-hidden>💡</span>
            <span>{title}</span>
          </div>
          <div className="text-slate-100 text-[13px] whitespace-pre-line">{content}</div>
          <div
            className={`absolute left-3 w-2.5 h-2.5 bg-slate-900 rotate-45 ${
              align === "top" ? "-bottom-1" : "-top-1"
            }`}
            aria-hidden
          />
        </div>
      )}
    </div>
  );
}
