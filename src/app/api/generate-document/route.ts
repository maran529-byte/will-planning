// 通用文书生成 API (Day 2 上线: 5 类非遗嘱文书)
// 路由: POST /api/generate-document?type=marriage|marital-property|divorce|child-custody|gift
// 输入: 问卷原始 formData (动态 key)
// 输出: { id, success, docType, plan, price }
//
// 实现策略:
//   1. 接收所有 formData 字段, 不做严格 zod (前端已分模块)
//   2. 按 type 选 AI prompt (中文《民法典》条款)
//   3. 调 MiniMax API 生成文书 (失败时用模板 fallback)
//   4. 存 Supabase (失败不阻塞, 返 in-memory id)
//   5. 返 price 由 server-side getPriceCents(plan) 决定 (防前端篡改)

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { MINIMAX_API_KEY, MINIMAX_BASE_URL, MINIMAX_MODEL } from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getPriceCents } from "@/lib/pricing";

const SUPPORTED_TYPES = new Set([
  "marriage", "marital-property", "divorce", "child-custody", "gift",
]);

const DOC_TITLES: Record<string, string> = {
  "marriage": "婚姻协议书",
  "marital-property": "婚内财产协议",
  "divorce": "离婚协议书",
  "child-custody": "子女抚养协议",
  "gift": "赠与协议",
};

const DOC_LAWS: Record<string, string> = {
  "marriage": "《中华人民共和国民法典》婚姻家庭编第1049条-1064条 (婚姻关系及财产约定)",
  "marital-property": "《中华人民共和国民法典》婚姻家庭编第1062条-1063条 (夫妻财产关系)",
  "divorce": "《中华人民共和国民法典》婚姻家庭编第1076条-1078条 (协议离婚)",
  "child-custody": "《中华人民共和国民法典》婚姻家庭编第1084条-1086条 (子女抚养)",
  "gift": "《中华人民共和国民法典》合同编第657条-660条 (赠与合同)",
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url === "https://your-project.supabase.co") return null;
  return supabaseAdmin;
}

function buildPrompt(docType: string, formData: Record<string, unknown>): string {
  const title = DOC_TITLES[docType];
  const law = DOC_LAWS[docType];
  const parts: string[] = [];
  parts.push(`请根据以下信息, 用专业、庄重的语气生成一份【${title}】草稿, 严格依据${law}的相关规定:`);
  parts.push("");
  // 列出所有非空字段
  for (const [key, value] of Object.entries(formData)) {
    if (value === "" || value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    const display = Array.isArray(value) ? value.join("、") : String(value);
    parts.push(`- ${key}: ${display}`);
  }
  parts.push("");
  parts.push(`要求:`);
  parts.push(`1. 标题居中, 字号大, 庄重`);
  parts.push(`2. 包含【双方基本信息】、【约定/分割/抚养/赠与内容】、【权利义务】、【生效与签署】等标准章节`);
  parts.push(`3. 引用《中华人民共和国民法典》相关条文`);
  parts.push(`4. 末尾注明"本协议为AI草稿, 双方签字后方可生效, 重大事项请咨询专业律师。"`);
  parts.push(`5. 不要泄露任何 PII 字段值到 prompt 之外 (隐私红线)`);
  return parts.join("\n");
}

function generateDefaultDocument(docType: string, formData: Record<string, unknown>, priceCents: number): string {
  const title = DOC_TITLES[docType];
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  return `${title}\n\n` +
    `甲方: ${formData.partyAName || formData.donorName || formData.parentAName || "______"}\n` +
    `乙方: ${formData.partyBName || formData.recipientName || formData.parentBName || "______"}\n` +
    `签订日期: ${dateStr}\n\n` +
    `鉴于双方的真实意愿, 现就相关事宜达成如下协议:\n\n` +
    `一、基本情况\n` +
    `(详见填写内容)\n\n` +
    `二、具体约定\n` +
    `(详见填写内容)\n\n` +
    `三、权利义务\n` +
    `1. 双方应诚实履行本协议\n` +
    `2. 任何变更须双方协商一致\n\n` +
    `四、附则\n` +
    `1. 本协议一式两份, 双方各执一份\n` +
    `2. 自双方签字之日起生效\n` +
    `3. 未尽事宜按《中华人民共和国民法典》执行\n\n` +
    `甲方: ________________________  乙方: ________________________\n` +
    `日期: ________________________  日期: ________________________\n\n` +
    `---\n\n` +
    `【重要提示】\n` +
    `本协议为AI生成的草稿版本, 不具备法律效力。\n` +
    `正式签署前, 请咨询专业律师进行审核, 重大事项建议办理公证。\n` +
    `本服务费用: ¥${(priceCents / 100).toFixed(2)}\n`;
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const docType = searchParams.get("type") || "";
    if (!SUPPORTED_TYPES.has(docType)) {
      return NextResponse.json(
        { code: "UNSUPPORTED_TYPE", error: `暂不支持的文书类型: ${docType}, 当前支持: ${Array.from(SUPPORTED_TYPES).join(", ")}` },
        { status: 400 }
      );
    }

    const json = await request.json();
    const formData: Record<string, unknown> = json.formData || json;
    const plan: string = json.plan || "ai";
    const confirmed = json.confirmed === true || json.confirmed === "我同意";

    if (!confirmed) {
      return NextResponse.json(
        { code: "NOT_CONFIRMED", error: "请先确认信息真实有效" },
        { status: 400 }
      );
    }

    const docId = uuidv4();
    const priceCents = getPriceCents(plan) ?? 1990;

    // P0: PIPL §51 — 不打印 PII
    console.log("Generate document: type=", docType, "answers_count=", Object.keys(formData).length, "plan=", plan);

    let docContent = "";

    // 调 MiniMax API
    if (MINIMAX_API_KEY && MINIMAX_API_KEY !== "") {
      try {
        const prompt = buildPrompt(docType, formData);
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
          docContent = data.choices?.[0]?.message?.content || "";
        }
      } catch (apiErr) {
        console.error(`[${docType}] MiniMax API error:`, apiErr);
      }
    }

    // Fallback
    if (!docContent) {
      docContent = generateDefaultDocument(docType, formData, priceCents);
    }

    // 存 Supabase (按 type 路由到不同表)
    const supabase = getSupabase();
    if (supabase) {
      const tableName = docType.replace(/-/g, "_");  // marital-property -> marital_property
      const { error } = await supabase.from(tableName).insert({
        id: docId,
        plan,
        price: priceCents,
        status: "generated",
        form_data: formData,
        doc_content: docContent,
        doc_content_html: `<pre style="white-space:pre-wrap">${docContent}</pre>`,
      });
      if (error) {
        console.error(`[${docType}] Supabase insert error:`, error);
      }
    }

    return NextResponse.json({
      id: docId,
      success: true,
      docType,
      plan,
      price: priceCents,
    });
  } catch (error) {
    console.error("Generate document error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", error: "生成失败, 请稍后重试" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const docType = searchParams.get("type") || "";

  if (!id || !SUPPORTED_TYPES.has(docType)) {
    return NextResponse.json(
      { code: "INVALID_REQUEST", error: "缺少 id 或 type 参数" },
      { status: 400 }
    );
  }

  const supabase = getSupabase();
  if (supabase) {
    const tableName = docType.replace(/-/g, "_");
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      return NextResponse.json({
        id: data.id,
        docType,
        plan: data.plan,
        price: data.price,
        docContent: data.doc_content,
        docContentHtml: data.doc_content_html,
        createdAt: data.created_at,
        formData: data.form_data,
      });
    }
  }

  return NextResponse.json(
    { code: "NOT_FOUND", error: "未找到相关记录" },
    { status: 404 }
  );
}
