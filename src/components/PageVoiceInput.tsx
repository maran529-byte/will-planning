'use client';

/**
 * PageVoiceInput - 整页 1 个语音按钮
 *
 * 改版 v1 (2026-06-09, 4 项需求 #1+#2):
 *   - 取代每字段 1 个 VoiceInput (问卷里原 3-6 个/页)
 *   - 录完后用 voice-fill-rules 自动拆分到本页字段
 *   - 弹 toast 显示填了哪些字段 + 哪些没匹配上
 *
 * 用法 (在问卷页):
 *   <PageVoiceInput module={currentModule} formData={formData} onApply={setFormData} />
 *
 * 设计: 不改 VoiceInput 底层, 复用其录音能力, 在它之上加 "自动拆分"
 */

import { useRef, useState } from 'react';
import { VoiceInput } from './VoiceInput';
import type { Module } from '@/lib/questionnaire';
import { fillFromVoice, applyFillResults, type FillReport } from '@/lib/voice-fill-rules';

interface PageVoiceInputProps {
  module: Module;
  formData: Record<string, unknown>;
  onApply: (newFormData: Record<string, unknown>) => void;
}

interface VoiceRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

function getSpeechRecognitionCtor(): (new () => VoiceRecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  // @ts-expect-error - vendor prefix
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function PageVoiceInput({ module, formData, onApply }: PageVoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [report, setReport] = useState<FillReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported] = useState(() => !!getSpeechRecognitionCtor());
  const recognitionRef = useRef<VoiceRecognitionInstance | null>(null);
  const [showReport, setShowReport] = useState(false);

  const startListening = () => {
    setError(null);
    setReport(null);
    setTranscript('');

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError('您的浏览器不支持语音识别 (请用 Chrome / Edge)');
      return;
    }

    // 释放旧实例
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* noop */ }
    }

    const recognition = new Ctor();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;          // 连续模式, 让用户一次性说完
    recognition.interimResults = true;      // 返回中间结果 (用于实时显示)
    recognition.maxAlternatives = 1;

    let finalTranscript = '';
    let interimTranscript = '';

    recognition.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      setTranscript((finalTranscript + ' ' + interimTranscript).trim());
    };

    recognition.onerror = (e: any) => {
      setError(`识别失败: ${e.error}`);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      // 结束时如果有内容, 自动应用规则
      if (finalTranscript.trim()) {
        applyRules(finalTranscript.trim());
      }
    };

    recognition.onstart = () => {
      setListening(true);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
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

  const applyRules = (text: string) => {
    const result = fillFromVoice(text, module, formData);
    if (result.filled.length > 0) {
      const newFormData = applyFillResults(formData, result.filled);
      onApply(newFormData);
    }
    setReport(result);
    setShowReport(true);
    // 5 秒后自动关闭报告
    setTimeout(() => setShowReport(false), 5000);
  };

  const handleClick = () => {
    if (!supported) {
      setError('请用 Chrome / Edge 浏览器 (或允许麦克风权限)');
      return;
    }
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // 手动再应用一次 (识别结束后用户可能想换字段顺序)
  const reapply = () => {
    if (transcript.trim()) {
      applyRules(transcript.trim());
    }
  };

  return (
    <div className="space-y-2">
      {/* 主按钮 + 录音状态 */}
      <button
        type="button"
        onClick={handleClick}
        title={listening ? '点击停止并应用' : '点击开始语音填入本页'}
        aria-label={listening ? '停止语音输入' : '开始语音填入本页'}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition ${
          listening
            ? 'bg-red-50 border-red-300 text-red-700 shadow-inner animate-pulse'
            : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 text-amber-800 hover:border-amber-300 hover:from-amber-100 hover:to-orange-100'
        }`}
      >
        {listening ? (
          <>
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <rect x="6" y="6" width="8" height="8" rx="1" />
            </svg>
            <span className="font-medium">🎙️ 正在听... (说完点此结束)</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a3 3 0 00-3 3v5a3 3 0 006 0V5a3 3 0 00-3-3z" />
              <path d="M3.5 9.5a.5.5 0 011 0 5.5 5.5 0 0011 0 .5.5 0 011 0 6.5 6.5 0 01-5.5 6.478V17h2a.5.5 0 010 1h-5a.5.5 0 010-1h2v-1.022A6.5 6.5 0 013.5 9.5z" />
            </svg>
            <span className="font-medium">🎤 语音填入本页 (一次说完自动分配)</span>
          </>
        )}
      </button>

      {/* 实时识别文字 (供用户核对) */}
      {transcript && (
        <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 leading-relaxed-cn">
          <span className="text-slate-400 text-xs">识别中: </span>
          {transcript}
        </div>
      )}

      {/* 报告 toast */}
      {showReport && report && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm animate-in fade-in slide-in-from-top-2">
          {report.filled.length > 0 ? (
            <>
              <p className="font-medium text-green-800 mb-1">
                ✅ 已自动填入 {report.filled.length} 项
              </p>
              <ul className="text-green-700 space-y-0.5 text-xs leading-relaxed-cn">
                {report.filled.map((f, i) => (
                  <li key={i}>• {f.display}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-amber-700">
              ⚠️ 未识别到可填字段, 请换种说法 (例: "我叫张三 30 岁 13800001234")
            </p>
          )}
          {report.unmatched.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-amber-600 cursor-pointer hover:text-amber-700">
                {report.unmatched.length} 段文字未能匹配, 点此查看
              </summary>
              <p className="text-xs text-slate-600 mt-1 italic leading-relaxed-cn">
                {report.unmatched.join(' / ')}
              </p>
            </details>
          )}
          <div className="flex gap-2 mt-2">
            <button
              onClick={reapply}
              className="text-xs px-2 py-1 text-green-700 hover:bg-green-100 rounded"
            >
              重新应用
            </button>
            <button
              onClick={() => setShowReport(false)}
              className="text-xs px-2 py-1 text-slate-600 hover:bg-slate-100 rounded"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <span>⚠</span>
          <span>{error}</span>
        </p>
      )}

      <p className="text-xs text-slate-400 text-center leading-relaxed-cn">
        💡 建议一次性说: "我叫张三 30 岁 13800001234 身份证 510101199001011234"
      </p>
    </div>
  );
}
