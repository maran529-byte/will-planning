// /api/revise — 在用户下载前, 允许重新生成文书 (最多 3 次)
//
// 设计目标 (2026-06-09, 需求 #4 "在用户未下载文书前, 可以提供多次修改内容的权限"):
//   1. 用户改了一两个字段, 不想再走完整个问卷
//   2. 拿当前文书的 formData + 用户新修改的字段 → 重新调 LLM
//   3. 每次 revise, revision_count + 1
//   4. 超过 3 次 → 400 拒绝, 提示用户 "请联系人工"
//
// 路由: POST /api/revise
// 请求: { id, docType, formDataUpdate: { ... } }
//   - id: 原 doc id (will / marriage / etc.)
//   - docType: 'will' | 'marriage' | 'marital-property' | 'divorce' | 'child-custody' | 'gift'
//   - formDataUpdate: 要修改的字段 (merge 进原 formData)
//
// 响应:
//   - 200: { success, id, docContent, docContentHtml, revisionCount, maxRevisions }
//   - 400: { code: 'MAX_REVISIONS_REACHED' | 'INVALID_REQUEST' }
//   - 404: { code: 'NOT_FOUND' }
//   - 500: { code: 'INTERNAL_ERROR' }

import { NextRequest, NextResponse } from "next/server";
import { MINIMAX_API_KEY, MINIMAX_BASE_URL, MINIMAX_MODEL } from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sanitizeFormData } from "@/lib/form-data-filter";

const MAX_REVISIONS = 3;

const SUPPORTED_TYPES = new Set([
  "will", "marriage", "marital-property", "divorce", "child-custody", "gift",
]);

const DOC_TITLES: Record<string, string> = {
  "will": "遗嘱",
  "marriage": "婚姻协议书",
  "marital-property": "婚内财产协议",
  "divorce": "离婚协议书",
  "child-custody": "子女抚养协议",
  "gift": "赠与协议",
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url === "https://your-project.supabase.co") return null;
  return supabaseAdmin;
}

function buildPrompt(docType: string, formData: Record<string, unknown>): string {
  const title = DOC_TITLES[docType] || "法律文书";
  const parts: string[] = [];
  parts.push(`请根据以下最新信息, 重新生成一份【${title}】草稿:`);
  parts.push("");
  for (const [key, value] of Object.entries(formData)) {
    if (value === "" || value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    const display = Array.isArray(value) ? value.join("、") : String(value);
    parts.push(`- ${key}: ${display}`);
  }
  parts.push("");
  parts.push(`要求: 保持与上一版相同的风格和结构, 但只更新用户修改的部分, 其它章节保持不变。`);
  parts.push(`末尾注明"本协议为AI草稿, 不具备法律效力, 双方签字后方可生效, 重大事项请咨询专业律师。"`);
  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { id, docType, formDataUpdate } = json;

    if (!id || !docType || !SUPPORTED_TYPES.has(docType)) {
      return NextResponse.json(
        { code: "INVALID_REQUEST", error: "缺少 id/docType 或类型不支持" },
        { status: 400 }
      );
    }
    if (!formDataUpdate || typeof formDataUpdate !== "object") {
      return NextResponse.json(
        { code: "INVALID_REQUEST", error: "formDataUpdate 必须是对象" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { code: "DB_UNAVAILABLE", error: "数据库未配置, 无法 revise" },
        { status: 503 }
      );
    }

    // will 走 wills 表, 其他 5 类走 type_name 表
    const tableName = docType === "will" ? "wills" : docType.replace(/-/g, "_");

    // 读原记录
    const { data: existing, error: readErr } = await supabase
      .from(tableName)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (readErr || !existing) {
      return NextResponse.json(
        { code: "NOT_FOUND", error: "未找到原记录" },
        { status: 404 }
      );
    }

    // 检查 revision_count
    const currentRevisions: number = existing.revision_count ?? 0;
    if (currentRevisions >= MAX_REVISIONS) {
      return NextResponse.json(
        {
          code: "MAX_REVISIONS_REACHED",
          error: `已达到最大修改次数 (${MAX_REVISIONS} 次), 如需进一步调整请联系客服`,
          revisionCount: currentRevisions,
          maxRevisions: MAX_REVISIONS,
        },
        { status: 400 }
      );
    }

    // 合并 formData
    const mergedFormData: Record<string, unknown> = {
      ...(existing.form_data || {}),
      ...(docType === "will" ? {} : formDataUpdate),  // wills 表用的是离散列, 不走 form_data
    };

    // 对非 will 类型, 直接用 formDataUpdate (因为 form_data 字段就是整张表的)
    const finalFormData = docType === "will"
      ? formDataUpdate  // will 不走 form_data, 走离散列 (此场景下不修改 PII 字段, 只改 minor 字段)
      : mergedFormData;

    // 过滤无效信息
    const sanitized = sanitizeFormData(finalFormData);

    // 调 LLM 重新生成
    let newContent = "";
    if (MINIMAX_API_KEY && MINIMAX_API_KEY !== "") {
      try {
        const prompt = buildPrompt(docType, sanitized);
        const response = await fetch(MINIMAX_BASE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${MINIMAX_API_KEY}`,
          },
          body: JSON.stringify({
            model: MINIMAX_MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          newContent = data.choices?.[0]?.message?.content || "";
        }
      } catch (apiErr) {
        console.error(`[revise ${docType}] MiniMax API error:`, apiErr);
      }
    }

    // Fallback: 如果 LLM 失败, 至少更新 form_data + revision_count
    if (!newContent) {
      newContent = existing.will_content || existing.doc_content || "";
    }

    // 更新数据库: content + revision_count + form_data
    const newRevisions = currentRevisions + 1;
    const updatePayload: Record<string, unknown> = {
      revision_count: newRevisions,
    };
    if (docType === "will") {
      updatePayload.will_content = newContent;
      updatePayload.will_content_html = `<pre style="white-space:pre-wrap">${newContent}</pre>`;
    } else {
      updatePayload.doc_content = newContent;
      updatePayload.doc_content_html = `<pre style="white-space:pre-wrap">${newContent}</pre>`;
      updatePayload.form_data = finalFormData;
    }

    const { error: updateErr } = await supabase
      .from(tableName)
      .update(updatePayload)
      .eq("id", id);

    if (updateErr) {
      // 降级: 如果 revision_count 列不存在, 只更新 content
      if (updateErr.message?.includes('revision_count') || updateErr.code === 'PGRST204') {
        console.warn(`[revise ${docType}] revision_count column missing, update content only. Run migration 20260609_add_revision_count.sql`);
        const fallbackPayload = { ...updatePayload };
        delete fallbackPayload.revision_count;
        const { error: retryErr } = await supabase
          .from(tableName)
          .update(fallbackPayload)
          .eq("id", id);
        if (retryErr) {
          console.error(`[revise ${docType}] Supabase update retry error:`, retryErr);
          return NextResponse.json(
            { code: "DB_UPDATE_FAILED", error: "更新记录失败" },
            { status: 500 }
          );
        }
      } else {
        console.error(`[revise ${docType}] Supabase update error:`, updateErr);
        return NextResponse.json(
          { code: "DB_UPDATE_FAILED", error: "更新记录失败" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      id,
      docType,
      docContent: newContent,
      docContentHtml: `<pre style="white-space:pre-wrap">${newContent}</pre>`,
      revisionCount: newRevisions,
      maxRevisions: MAX_REVISIONS,
    });
  } catch (error) {
    console.error("Revise error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", error: "重新生成失败, 请稍后重试" },
      { status: 500 }
    );
  }
}
