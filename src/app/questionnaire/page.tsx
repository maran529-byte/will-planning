"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { modules } from "@/lib/questionnaire";
import type { Question } from "@/lib/questionnaire";

// 初始表单数据 — 扁平结构，对应各字段
const INITIAL_DATA = {
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
  assetTypes: [] as string[],       // checkbox: 房产/银行存款/股票基金...
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

function QuestionnaireContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "ai";

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<typeof INITIAL_DATA>(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totalSteps = modules.length;
  const currentModule = modules[currentStep];

  const updateFormData = (key: keyof typeof INITIAL_DATA, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 将表单数据转换为 API 期望的格式
  const transformForApi = () => {
    // 资产: assetTypes checkbox 数组 -> Asset[]
    const assets = (formData.assetTypes || []).map((type) => ({
      type,
      description: type === "房产" ? formData.propertyDesc : "",
      estimatedValue: type === "房产" ? 0 : formData.otherAssetsValue || 0,
      location: "",
    }));

    // 特殊安排
    const specialArrangements: Array<{ type: string; description: string }> = [];
    if (formData.needGuardian === "指定监护人") {
      specialArrangements.push({ type: "guardian", description: "指定监护人" });
    }
    if (formData.hasPet === "有") {
      specialArrangements.push({ type: "pet", description: "宠物安排" });
    }
    if (formData.digitalHeritage) {
      specialArrangements.push({ type: "digital", description: formData.digitalHeritage });
    }

    // 确认字段: "我同意" -> true
    const confirmed = formData.confirmed === true || formData.confirmed === "我同意";

    return {
      name: formData.name,
      age: formData.age,
      idCard: formData.idCard,
      phone: formData.phone,
      maritalStatus: formData.maritalStatus,
      hasMinorChildren: formData.hasMinorChildren === "是",
      children: formData.children,
      parents: "",
      assets,
      heirs: formData.heirs,
      specialArrangements,
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
    setIsSubmitting(true);
    setError("");

    try {
      const payload = transformForApi();
      const response = await fetch("/api/generate-will", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("生成失败，请稍后重试");
      }

      const result = await response.json();
      router.push(`/result?id=${result.id}&plan=${plan}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (question: Question) => {
    const value = formData[question.key as keyof typeof INITIAL_DATA];

    switch (question.type) {
      case "radio":
        return (
          <div className="space-y-3">
            <p className="font-medium text-slate-800 mb-3">{question.question}</p>
            {question.options?.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${
                  value === opt.value
                    ? "border-amber-500 bg-amber-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name={question.key}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={() => updateFormData(question.key as keyof typeof INITIAL_DATA, opt.value)}
                  className="w-4 h-4 text-amber-600"
                />
                <span className="text-slate-700">{opt.label}</span>
              </label>
            ))}
          </div>
        );

      case "checkbox":
        const checkedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-3">
            <p className="font-medium text-slate-800 mb-3">{question.question}</p>
            {question.options?.map((opt) => {
              const isChecked = checkedValues.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${
                    isChecked ? "border-amber-500 bg-amber-50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    value={opt.value}
                    checked={isChecked}
                    onChange={(e) => {
                      const newValues = e.target.checked
                        ? [...checkedValues, opt.value]
                        : checkedValues.filter((v) => v !== opt.value);
                      updateFormData(question.key as keyof typeof INITIAL_DATA, newValues);
                    }}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span className="text-slate-700">{opt.label}</span>
                </label>
              );
            })}
          </div>
        );

      case "text":
        return (
          <div>
            <p className="font-medium text-slate-800 mb-3">{question.question}</p>
            <input
              type="text"
              value={(value as string) || ""}
              onChange={(e) => updateFormData(question.key as keyof typeof INITIAL_DATA, e.target.value)}
              placeholder={question.placeholder}
              className="w-full p-4 border-2 border-slate-200 rounded-lg focus:border-amber-500 focus:outline-none transition"
            />
          </div>
        );

      case "number":
        return (
          <div>
            <p className="font-medium text-slate-800 mb-3">{question.question}</p>
            <input
              type="number"
              value={(value as number) || ""}
              onChange={(e) =>
                updateFormData(
                  question.key as keyof typeof INITIAL_DATA,
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              placeholder={question.placeholder}
              className="w-full p-4 border-2 border-slate-200 rounded-lg focus:border-amber-500 focus:outline-none transition"
            />
          </div>
        );

      case "textarea":
        return (
          <div>
            <p className="font-medium text-slate-800 mb-3">{question.question}</p>
            <textarea
              value={(value as string) || ""}
              onChange={(e) => updateFormData(question.key as keyof typeof INITIAL_DATA, e.target.value)}
              placeholder={question.placeholder}
              rows={4}
              className="w-full p-4 border-2 border-slate-200 rounded-lg focus:border-amber-500 focus:outline-none transition resize-none"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 顶部进度条 */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <Link href="/" className="text-slate-600 hover:text-amber-600 transition">
              ← 返回
            </Link>
            <span className="text-sm text-slate-500">
              第 {currentStep + 1} / {totalSteps} 部分
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
          <h1 className="text-lg font-semibold text-slate-800 mt-2">
            {currentModule.icon} {currentModule.title}
          </h1>
          <p className="text-sm text-slate-500">{currentModule.description}</p>
        </div>
      </header>

      {/* 问题区域 */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="space-y-8">
            {currentModule.questions.map((q) => (
              <div key={q.id}>{renderQuestion(q)}</div>
            ))}
          </div>

          {/* 导航按钮 */}
          <div className="flex justify-between mt-10 pt-6 border-t border-slate-100">
            {currentStep > 0 ? (
              <button
                onClick={prevStep}
                className="px-6 py-3 border-2 border-slate-200 rounded-lg font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                上一步
              </button>
            ) : (
              <div />
            )}

            {currentStep < totalSteps - 1 ? (
              <button
                onClick={nextStep}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition"
              >
                下一步
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition disabled:opacity-50"
              >
                {isSubmitting ? "生成中..." : "生成遗嘱草稿"}
              </button>
            )}
          </div>
        </div>

        {/* 步骤指示器 */}
        <div className="flex justify-center gap-2 mt-8">
          {modules.map((mod, idx) => (
            <div
              key={mod.id}
              className={`w-2 h-2 rounded-full transition ${
                idx === currentStep ? "bg-amber-500 w-4" : idx < currentStep ? "bg-amber-300" : "bg-slate-300"
              }`}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

export default function QuestionnairePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-slate-500">加载中...</p></div>}>
      <QuestionnaireContent />
    </Suspense>
  );
}
