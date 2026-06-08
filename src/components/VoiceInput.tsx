'use client';

/**
 * VoiceInput - 语音输入 (Web Speech API)
 *
 * 改版 v1 (2026-06-08, Phase C):
 *   - 浏览器原生 SpeechRecognition (Chrome/Edge 完整支持, Safari 部分)
 *   - 中文识别 (zh-CN)
 *   - 连续模式: 说完自动停止, 再次点击可重新开始
 *   - 不支持时: 按钮不渲染 (graceful degradation)
 *   - 与原 input/textarea 解耦, 通过 onChange 回调同步
 *
 * 用法:
 *   <input value={x} onChange={...} />
 *   <VoiceInput value={x} onChange={setX} lang="zh-CN" />
 *
 * 安全/隐私:
 *   - 浏览器会把音频发到 Google (Chromium) / Apple (Safari) 服务器
 *   - 生产环境需在 UI 上告知用户 ("您的语音将由浏览器发送到识别服务")
 */

import { useEffect, useRef, useState } from 'react';

interface VoiceInputProps {
  /** 当前值 (用于"追加"模式 — 不会替换, 而是在末尾追加) */
  value: string;
  /** 值变化时回调 */
  onChange: (newValue: string) => void;
  /** 识别语言 BCP-47, 默认 zh-CN */
  lang?: string;
  /** 按钮大小 (sm/md) */
  size?: 'sm' | 'md';
  /** 自定义 className */
  className?: string;
  /** 是否在 textarea 上使用 (调整图标位置) */
  multiline?: boolean;
}

// 浏览器 API 类型 (lib.dom.d.ts 里没有, 手动声明)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  // @ts-expect-error - vendor prefix
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function VoiceInput({
  value,
  onChange,
  lang = 'zh-CN',
  size = 'md',
  className = '',
  multiline = false,
}: VoiceInputProps) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setSupported(!!getSpeechRecognitionCtor());
  }, []);

  const startListening = () => {
    setError(null);
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError('您的浏览器不支持语音识别');
      return;
    }

    // 释放旧实例
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* noop */ }
    }

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = false;        // 单句模式 (说完自动停)
    recognition.interimResults = false;    // 不返回中间结果 (避免乱跳)
    recognition.maxAlternatives = 1;

    recognition.onresult = (e) => {
      const result = e.results[e.resultIndex];
      if (result && result[0]) {
        const transcript = result[0].transcript.trim();
        if (transcript) {
          // 追加到现有值 (空格分隔, 若末尾已有标点则不加)
          const sep = value && !/[\s\n。,，.!?！？]$/.test(value) ? ' ' : '';
          onChange(value ? `${value}${sep}${transcript}` : transcript);
        }
      }
    };

    recognition.onerror = (e) => {
      setError(`识别失败: ${e.error}`);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onstart = () => {
      setListening(true);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      setError('启动语音识别失败');
      setListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* noop */ }
    }
    setListening(false);
  };

  const handleClick = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // 不支持时, 按钮不渲染
  if (!supported) {
    return null;
  }

  const sizeClasses = size === 'sm'
    ? 'h-8 w-8 text-sm'
    : 'h-10 w-10 text-base';
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <div className={`inline-flex flex-col items-end gap-1 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        title={listening ? '点击停止' : '点击开始语音输入'}
        aria-label={listening ? '停止语音输入' : '开始语音输入'}
        className={`${sizeClasses} flex items-center justify-center rounded-full transition-all ${
          listening
            ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg animate-pulse'
            : 'bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-700 border border-slate-200 hover:border-amber-300'
        }`}
      >
        {listening ? (
          // 录音中: 停止图标 (实心方块)
          <svg className={iconSize} viewBox="0 0 20 20" fill="currentColor">
            <rect x="6" y="6" width="8" height="8" rx="1" />
          </svg>
        ) : (
          // 未录音: 麦克风图标
          <svg className={iconSize} viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a3 3 0 00-3 3v5a3 3 0 006 0V5a3 3 0 00-3-3z" />
            <path d="M3.5 9.5a.5.5 0 011 0 5.5 5.5 0 0011 0 .5.5 0 011 0 6.5 6.5 0 01-5.5 6.478V17h2a.5.5 0 010 1h-5a.5.5 0 010-1h2v-1.022A6.5 6.5 0 013.5 9.5z" />
          </svg>
        )}
      </button>
      {listening && (
        <span className="text-xs text-red-600 font-medium animate-pulse whitespace-nowrap">
          🎙️ 正在听...
        </span>
      )}
      {error && !listening && (
        <span className="text-xs text-red-600 whitespace-nowrap">{error}</span>
      )}
    </div>
  );
}
