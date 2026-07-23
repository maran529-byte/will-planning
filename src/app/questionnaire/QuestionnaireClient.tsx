"use client";

import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { modules as willModules } from "@/lib/questionnaire";
import type { Question, Module } from "@/lib/questionnaire";
import { getModulesForType } from "@/lib/questionnaire-shared";
import { PageVoiceInput } from "@/components/PageVoiceInput";

// 初始表单数据 — 扁平结构，对应各字段
// 注: 用 Record<string, unknown> 兼容 6 类文书 (will + 5 个非 will 模块有不同 key)
type FormData = Record<string, unknown>;

const INITIAL_DATA: FormData = {
  // 基本信息
  name: "",
  age: undefined as number | undefined,
  idCard: "",
  phone: "",
  // 家庭状况
  maritalStatus: "",
  hasMinorChildren: "",
  children: "",
  hasDependents: "",
  // 财产状况
  assetTypes: [] as string[],
  propertyDesc: "",
  otherAssetsValue: undefined as number | undefined,
  hasDebt: "",
  // 继承人
  heirs: "",
  distributionMethod: "",
  excludeHeir: "",
  vulnerableHeir: "",
  // 特殊安排
  needGuardian: "",
  hasPet: "",
  digitalHeritage: "",
  // 医疗意愿
  lifeSupport: "",
  organDonation: "",
  funeralArrangement: "",
  // 确认
  existingWill: "",
  understandNotarization: "",
  confirmed: false,
};

// localStorage 缓存 key (按 docType 分组, 避免不同文书覆盖)
const STORAGE_KEY = (docType: string) => `aiwill:questionnaire:${docType}`;
const STEP_KEY = (docType: string) => `aiwill:questionnaire:step:${docType}`;

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function QuestionnaireContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "ai";
  const docType = searchParams.get("type") || "will";

  // 当前支持的文书类型白名单 (与 /doc-type/page.tsx 同步)
  const SUPPORTED_TYPES = ["will", "marriage", "marital-property", "divorce", "child-custody", "gift"] as const;
  const isSupportedType = SUPPORTED_TYPES.includes(docType as (typeof SUPPORTED_TYPES)[number]);

  // 根据 type 选问卷模块
  const modules: Module[] = docType === "will" ? willModules : (getModulesForType(docType) || willModules);

  // ── P0-3: localStorage 自动保存 + 恢复 ──
  const [hydrated, setHydrated] = useState(false);
  const [formData, setFormData] = useState<FormData>(INITIAL_DATA);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showRestoreHint, setShowRestoreHint] = useState(false);

  // 1. 首次挂载: 从 localStorage 恢复
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY(docType));
      const savedStep = localStorage.getItem(STEP_KEY(docType));
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData({ ...INITIAL_DATA, ...parsed });
        if (savedStep) {
          setCurrentStep(parseInt(savedStep, 10) || 0);
        }
        // 只在确实有数据时提示
        const hasData = Object.values(parsed).some(
          (v) => !isEmpty(v) && v !== false
        );
        if (hasData) setShowRestoreHint(true);
      }
    } catch {
      // localStorage 不可用 (隐私模式) 时静默忽略
    }
    setHydrated(true);
  }, [docType]);

  // 2. 任何字段变化 → debounce 写 localStorage
  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY(docType), JSON.stringify(formData));
        localStorage.setItem(STEP_KEY(docType), String(currentStep));
      } catch {
        // 容量满 / 隐私模式 → 静默
      }
    }, 300);
    return () => clearTimeout(t);
  }, [formData, currentStep, hydrated, docType]);

  const totalSteps = modules.length;
  const currentModule = modules[currentStep];
  const remainingSteps = totalSteps - currentStep - 1;

  const updateFormData = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    // 清除该字段的错误提示 (用户改了就别再红)
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // ── P0-1: 下一步前校验必填项, 不通过则定位到第一个空字段 ──
  const validateCurrentStep = useCallback((): boolean => {
    const requiredQs = currentModule.questions.filter((q) => q.required);
    const newErrors: Record<string, string> = {};
    for (const q of requiredQs) {
      const v = formData[q.key];
      if (isEmpty(v)) {
        newErrors[q.key] = "此项必填";
      }
      // 数字字段额外校验
      if (q.type === "number" && !isEmpty(v)) {
        const n = Number(v);
        if (isNaN(n) || n < 0) newErrors[q.key] = "请输入有效数字";
      }
      // 手机号简单格式
      if (q.key === "phone" && !isEmpty(v)) {
        if (!/^1[3-9]\d{9}$/.test(String(v))) {
          newErrors[q.key] = "请输入正确的 11 位手机号";
        }
      }
    }
    setFieldErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      // 滚动到第一个错误字段
      setTimeout(() => {
        const firstKey = Object.keys(newErrors)[0];
        const el = document.querySelector(`[data-field="${firstKey}"]`);
        if (el) {
          (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
          (el as HTMLElement).focus?.();
        }
      }, 50);
      return false;
    }
    return true;
  }, [currentModule, formData]);

  const nextStep = () => {
    if (!validateCurrentStep()) {
      return;
    }
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      // P0-5: 切步骤时滚到顶部
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // 跳转到指定步骤 (步骤指示器可点)
  const goToStep = (idx: number) => {
    if (idx < currentStep) {
      // 后退永远允许
      setCurrentStep(idx);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (idx === currentStep) {
      return;
    } else {
      // 前进需要校验当前步骤
      if (!validateCurrentStep()) return;
      setCurrentStep(idx);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // 清空草稿 (重新开始)
  const clearDraft = useCallback(() => {
    if (!confirm("确定清空当前问卷草稿? 所有已填信息将丢失。")) return;
    try {
      localStorage.removeItem(STORAGE_KEY(docType));
      localStorage.removeItem(STEP_KEY(docType));
    } catch {}
    setFormData(INITIAL_DATA);
    setCurrentStep(0);
    setFieldErrors({});
    setShowRestoreHint(false);
  }, [docType]);

  // 关闭"已恢复草稿"提示
  const dismissRestoreHint = () => {
    setShowRestoreHint(false);
  };

  // 将表单数据转换为 API 期望的格式
  const transformForApi = () => {
    const assetTypes = (formData.assetTypes as string[] | undefined) || [];
    const assets = assetTypes.map((type) => ({
      type,
      description: type === "房产" ? String(formData.propertyDesc || "") : "",
      estimatedValue: type === "房产" ? 0 : Number(formData.otherAssetsValue || 0),
      location: "",
    }));

    const specialArrangements: Array<{ type: string; description: string }> = [];
    if (formData.needGuardian === "指定监护人") {
      specialArrangements.push({ type: "guardian", description: "指定监护人" });
    }
    if (formData.hasPet === "有") {
      specialArrangements.push({ type: "pet", description: "宠物安排" });
    }
    if (formData.digitalHeritage) {
      specialArrangements.push({ type: "digital", description: String(formData.digitalHeritage) });
    }

    const confirmedRaw = formData.confirmed as unknown;
    const confirmed = confirmedRaw === true || confirmedRaw === "我同意";

    const childrenArr = formData.children && String(formData.children).trim()
      ? String(formData.children).split(/[、,,;;\n]/).map(s => s.trim()).filter(Boolean).map(name => ({ name, relation: "子女" }))
      : [];
    const heirsArr = formData.heirs && String(formData.heirs).trim()
      ? String(formData.heirs).split(/[、,,;;\n]/).map(s => s.trim()).filter(Boolean).map((name, i, arr) => ({
          name,
          relation: "继承人",
          share: arr.length > 0 ? Math.floor(100 / arr.length) : 100,
        }))
      : [];

    return {
      name: formData.name,
      age: formData.age,
      idCard: formData.idCard,
      phone: formData.phone,
      maritalStatus: formData.maritalStatus,
      hasMinorChildren: formData.hasMinorChildren === "是",
      children: childrenArr,
      parents: [],
      assets,
      heirs: heirsArr,
      specialArrangements: specialArrangements.length
        ? Object.fromEntries(specialArrangements.map(s => [s.type, s.description]))
        : {},
      medicalWishes: {
        lifeSupport: formData.lifeSupport,
        organDonation: formData.organDonation,
        palliativeCare: formData.funeralArrangement,
      },
      plan,
      confirmed,
    };
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;
    setIsSubmitting(true);
    setError("");

    try {
      const payload = transformForApi();
      const endpoint = docType === "will"
        ? "/api/generate-will"
        : `/api/generate-document?type=${docType}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || "生成失败，请稍后重试");
      }

      const result = await response.json();
      // 成功后清掉草稿
      try {
        localStorage.removeItem(STORAGE_KEY(docType));
        localStorage.removeItem(STEP_KEY(docType));
      } catch {}
      router.push(`/result?id=${result.id}&plan=${plan}&type=${docType}&docType=${docType}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
      setIsSubmitting(false);
    }
  };

  // ── 渲染单题: 整行可点 + 错误状态 + 必填星号 ──
  const renderQuestion = (question: Question) => {
    const value = formData[question.key];
    const err = fieldErrors[question.key];

    const baseInputClass =
      "w-full px-4 py-3 text-base input-ios-fix border-2 rounded-xl transition " +
      "focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 " +
      (err ? "border-red-400 bg-red-50" : "border-slate-200 bg-white");

    const labelTextClass = "text-base font-medium text-slate-800 leading-relaxed-cn";

    return (
      <div data-field={question.key} className="space-y-2">
        <label className="flex items-start gap-1 text-base font-medium text-slate-800 leading-relaxed-cn">
          {question.question}
          {question.required && <span className="text-red-500 text-base ml-0.5" aria-label="必填">*</span>}
          {!question.required && <span className="text-slate-400 text-sm ml-1">(选填)</span>}
        </label>
        {question.hint && (
          <p className="text-sm text-slate-500 leading-relaxed-cn">{question.hint}</p>
        )}

        {question.type === "radio" && (
          <div className="space-y-2.5 mt-2">
            {question.options?.map((opt) => {
              const selected = value === opt.value;
              return (
                // P0-9: 整行 label 可点, 含 padding, 移动端热区 ≥ 44pt
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 cursor-pointer transition select-none ${
                    selected
                      ? "border-amber-500 bg-amber-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 active:bg-slate-50"
                  }`}
                >
                  <span
                    className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                      selected ? "border-amber-500 bg-amber-500" : "border-slate-300"
                    }`}
                  >
                    {selected && <span className="w-2 h-2 rounded-full bg-white" />}
                  </span>
                  <span className="text-base text-slate-800 flex-1 leading-relaxed-cn">
                    {opt.label}
                  </span>
                  {/* 隐藏原生 radio, 但保持可访问性 */}
                  <input
                    type="radio"
                    name={question.key}
                    value={opt.value}
                    checked={selected}
                    onChange={() => updateFormData(question.key, opt.value)}
                    className="sr-only"
                  />
                </label>
              );
            })}
          </div>
        )}

        {question.type === "checkbox" && (
          (() => {
            const checkedValues = Array.isArray(value) ? value : [];
            return (
              <div className="space-y-2.5 mt-2">
                {question.options?.map((opt) => {
                  const isChecked = checkedValues.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 cursor-pointer transition select-none ${
                        isChecked
                          ? "border-amber-500 bg-amber-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 active:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                          isChecked ? "border-amber-500 bg-amber-500" : "border-slate-300 bg-white"
                        }`}
                      >
                        {isChecked && (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className="text-base text-slate-800 flex-1 leading-relaxed-cn">
                        {opt.label}
                      </span>
                      <input
                        type="checkbox"
                        value={opt.value}
                        checked={isChecked}
                        onChange={(e) => {
                          const newValues = e.target.checked
                            ? [...checkedValues, opt.value]
                            : checkedValues.filter((v) => v !== opt.value);
                          updateFormData(question.key, newValues);
                        }}
                        className="sr-only"
                      />
                    </label>
                  );
                })}
              </div>
            );
          })()
        )}

        {question.type === "text" && (
          <input
            type="text"
            value={(value as string) || ""}
            onChange={(e) => updateFormData(question.key, e.target.value)}
            placeholder={question.placeholder}
            inputMode="text"
            className={baseInputClass + " mt-2"}
          />
        )}

        {question.type === "number" && (
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={(value as number) ?? ""}
            onChange={(e) =>
              updateFormData(
                question.key,
                e.target.value ? parseInt(e.target.value) : undefined
              )
            }
            placeholder={question.placeholder}
            className={baseInputClass + " mt-2 tabular-nums"}
          />
        )}

        {question.type === "textarea" && (
          <textarea
            value={(value as string) || ""}
            onChange={(e) => updateFormData(question.key, e.target.value)}
            placeholder={question.placeholder}
            rows={4}
            className={baseInputClass + " mt-2 resize-none leading-relaxed-cn"}
          />
        )}

        {err && (
          <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
            <span>⚠</span>
            <span>{err}</span>
          </p>
        )}
      </div>
    );
  };

  // 已完成模块数 (用于步骤指示器可点判断)
  const completedSteps = useMemo(() => {
    // 简化: 只有比 currentStep 小的算完成 (用户走过的)
    return new Set(Array.from({ length: currentStep }, (_, i) => i));
  }, [currentStep]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* 顶部进度条 - sticky */}
      <header className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50 safe-area-top">
        <div className="max-w-2xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between mb-3">
            <Link href="/doc-type" className="text-sm sm:text-base text-slate-600 hover:text-amber-600 active:text-amber-700 transition flex items-center gap-1">
              <span aria-hidden>←</span>
              <span>返回</span>
            </Link>
            <div className="text-right">
              <div className="text-sm font-medium text-slate-700 tabular-nums">
                第 {currentStep + 1} / {totalSteps} 部分
              </div>
              {/* P0-6: 显示"还剩 X 步"减少焦虑 */}
              {remainingSteps > 0 && (
                <div className="text-xs text-slate-500 mt-0.5">
                  还剩 {remainingSteps} 部分 · 约 {remainingSteps * 1} 分钟
                </div>
              )}
              {remainingSteps === 0 && (
                <div className="text-xs text-amber-600 mt-0.5 font-medium">最后一步 · 即将生成</div>
              )}
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 to-amber-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-800 mt-3 leading-tight-cn flex items-center gap-2">
            <span className="text-2xl" aria-hidden>{currentModule.icon}</span>
            <span>{currentModule.title}</span>
          </h1>
          {currentModule.description && (
            <p className="text-sm text-slate-500 mt-1 leading-relaxed-cn">{currentModule.description}</p>
          )}
        </div>
      </header>

      {/* P1: 整页 1 个语音按钮 (取代每字段 1 个) — 固定在顶部下方, 滚动时仍可见 */}
      <div className="sticky top-[152px] sm:top-[170px] z-40 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <PageVoiceInput
            module={currentModule}
            formData={formData}
            onApply={setFormData}
          />
        </div>
      </div>

      {/* 问题区域 */}
      <main className="max-w-2xl mx-auto px-4 py-6 sm:py-8 pb-32 sm:pb-8">
        {/* 恢复草稿提示 (P0-3) */}
        {showRestoreHint && hydrated && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <span className="text-amber-600 text-xl flex-shrink-0">💾</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-900">已自动恢复上次草稿</p>
              <p className="text-xs text-amber-700 mt-0.5">所有填写内容已自动保存, 可随时离开返回继续</p>
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button
                onClick={dismissRestoreHint}
                className="text-xs px-2 py-1 text-amber-700 hover:bg-amber-100 rounded"
              >
                知道了
              </button>
              <button
                onClick={clearDraft}
                className="text-xs px-2 py-1 text-amber-700 hover:bg-amber-100 rounded"
              >
                重新填写
              </button>
            </div>
          </div>
        )}

        {!isSupportedType && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">🚧</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3 leading-tight-cn">
              本类文书问卷开发中
            </h2>
            <p className="text-slate-600 mb-6 leading-relaxed-cn">
              您选择的文书类型 <code className="px-2 py-0.5 bg-white rounded text-amber-700 font-mono">{docType}</code> 问卷正在开发中。
              <br />
              目前已实装的完整文书类型: <strong>遗嘱</strong> (7 大模块 25 道题)。
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/doc-type?type=will"
                className="inline-block bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold px-6 py-3 rounded-lg transition"
              >
                改为创建遗嘱
              </Link>
              <Link
                href="/doc-type"
                className="inline-block bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-semibold px-6 py-3 rounded-lg transition"
              >
                返回选择其他类型
              </Link>
            </div>
          </div>
        )}

        {isSupportedType && (
          <>
            <div className="bg-white rounded-2xl shadow-sm p-5 sm:p-8 border border-slate-100">
              {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-start gap-2">
                  <span className="text-xl">❌</span>
                  <div className="flex-1">
                    <p className="font-medium">生成失败</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}

              <div className="space-y-7">
                {currentModule.questions.map((q) => (
                  <div key={q.id}>{renderQuestion(q)}</div>
                ))}
              </div>
            </div>

            {/* 步骤指示器 (P0-9 + P0-6: 可点跳步) */}
            <div className="flex justify-center gap-2 mt-6 flex-wrap px-2">
              {modules.map((mod, idx) => {
                const isCurrent = idx === currentStep;
                const isCompleted = completedSteps.has(idx);
                const isClickable = isCompleted || isCurrent;
                return (
                  <button
                    key={mod.id}
                    onClick={() => goToStep(idx)}
                    disabled={!isClickable}
                    aria-label={`跳到第 ${idx + 1} 部分: ${mod.title}`}
                    className={`h-2 rounded-full transition-all ${
                      isCurrent
                        ? "w-8 bg-amber-500"
                        : isCompleted
                        ? "w-2 bg-amber-300 hover:bg-amber-400 cursor-pointer"
                        : "w-2 bg-slate-300 cursor-not-allowed"
                    }`}
                  />
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* P0-5: 底部固定导航栏 (避开软键盘 + 安全区) */}
      {isSupportedType && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/98 backdrop-blur-sm border-t border-slate-200 z-40 pb-safe">
          <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center gap-3">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="px-5 py-3 border-2 border-slate-200 rounded-xl text-base font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <span>←</span>
              <span className="hidden sm:inline">上一步</span>
            </button>

            {/* 进度文字 (移动端) */}
            <div className="text-xs text-slate-400 sm:hidden tabular-nums">
              {currentStep + 1}/{totalSteps}
            </div>

            {currentStep < totalSteps - 1 ? (
              <button
                onClick={nextStep}
                className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:from-amber-700 active:to-amber-800 text-white rounded-xl text-base font-semibold transition shadow-sm hover:shadow-md flex items-center justify-center gap-1.5"
              >
                <span>下一步</span>
                <span aria-hidden>→</span>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:from-amber-700 active:to-amber-800 text-white rounded-xl text-base font-semibold transition shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4zm2 5.3A8 8 0 014 12H0c0 3 1.1 5.8 3 7.9l3-2.6z" />
                    </svg>
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <span>生成文书草稿</span>
                    <span className="text-amber-100 text-sm">¥19.9</span>
                  </>
                )}
              </button>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}

export function QuestionnaireClientRoot() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent mb-3" />
          <p className="text-slate-500">加载问卷中...</p>
        </div>
      </div>
    }>
      <QuestionnaireContent />
    </Suspense>
  );
}
