import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { MINIMAX_API_KEY, MINIMAX_BASE_URL, MINIMAX_MODEL } from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getPriceCents } from "@/lib/pricing";
// Batch B (2026-06-09): 需求 #3 - 生成前自动过滤无效/占位信息
import { sanitizeFormData, countDroppedFields } from "@/lib/form-data-filter";

// 获取Supabase客户端（兼容无环境变量时）
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url === "https://your-project.supabase.co") {
    return null;
  }
  return supabaseAdmin;
}

// P0: zod schema for generate-will input. Strict-but-permissive: we accept
// the existing questionnaire shape, but every field that contains PII
// (name, idCard, phone, address, spouseIdCard) is bounded and typed so a
// malicious client cannot inject arbitrary keys or giant blobs.
//
// 改版 v2 (2026-06-08): plan 扩展 'expert' (从 'lawyer' 改名而来, 与 pricing.ts 一致).
//   - 旧值 'lawyer' / 'family' 仍兼容 (历史数据)
//   - 'family' 已下架, 但 schema 仍接受 (避免老链接 400)
//   - 实际价格由 getPriceCents(plan) 决定, family 走 fallback
const generateWillSchema = z.object({
  name: z.string().min(1).max(64),
  age: z.number().int().min(0).max(150),
  gender: z.string().max(16).optional(),
  idCard: z.string().max(32).optional(),
  phone: z.string().max(32).optional(),
  address: z.string().max(256).optional(),
  maritalStatus: z.string().max(32).optional(),
  spouseName: z.string().max(64).optional(),
  spouseIdCard: z.string().max(32).optional(),
  children: z.array(z.any()).optional(),
  parents: z.array(z.any()).optional(),
  assets: z.array(z.any()).optional(),
  heirs: z.array(z.any()).optional(),
  specialArrangements: z.record(z.string(), z.any()).optional(),
  medicalWishes: z.record(z.string(), z.any()).optional(),
  // 改版 v2: 加 'expert' 通道 (从 'lawyer' 改名). 'family' 历史值仍接受.
  plan: z.enum(['ai', 'expert', 'lawyer', 'family']).default('ai'),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = generateWillSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'INVALID_REQUEST',
          error: '缺少或无效的参数',
          issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
        },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const {
      name, age, gender, idCard, phone, address,
      maritalStatus, spouseName, spouseIdCard,
      children, parents, assets, heirs,
      specialArrangements, medicalWishes, plan,
    } = body;

    const willId = uuidv4();

    // P0: PIPL §51 — never log PII (name/idCard/phone/address).
    // Log only non-PII metadata: doc type, answer count, plan.
    console.log(
      "Generate will: doc_type=",
      "will",
      "answers_count=",
      Object.keys(body).length,
      "plan=",
      plan
    );

    // Batch B (2026-06-09): 需求 #3 - 自动过滤无效/占位信息 (在 LLM prompt 之前)
    const filterStats = countDroppedFields(body as Record<string, unknown>);
    const sanitizedBody = sanitizeFormData(body as Record<string, unknown>);
    if (filterStats.dropped > 0) {
      console.log(`[will] Auto-filtered ${filterStats.dropped}/${filterStats.total} placeholder field(s)`);
    }
    // 重建: 把 sanitized 后的 children/parents/assets/heirs 取出来 (它们是数组, 不走 placeholder 检查)
    const sanitizedChildren = (sanitizedBody.children as Array<unknown>) ?? children;
    const sanitizedParents = (sanitizedBody.parents as Array<unknown>) ?? parents;
    const sanitizedAssets = (sanitizedBody.assets as Array<unknown>) ?? assets;
    const sanitizedHeirs = (sanitizedBody.heirs as Array<unknown>) ?? heirs;
    const sanitizedSpecialArrangements = (sanitizedBody.specialArrangements as Record<string, unknown>) ?? specialArrangements;
    const sanitizedMedicalWishes = (sanitizedBody.medicalWishes as Record<string, unknown>) ?? medicalWishes;

    // 构建prompt (用 sanitized 后的字段, 但保留 zod 校验过的 name/age 强类型)
    const prompt = buildWillPrompt({
      name, age, maritalStatus, spouseName,
      children: sanitizedChildren as Array<{name: string; relation: string}>,
      parents: sanitizedParents as Array<{name: string; relation: string}>,
      assets: sanitizedAssets as Array<{type: string; description: string; value?: number}>,
      heirs: sanitizedHeirs as Array<{name: string; relation: string; share: number}>,
      specialArrangements: sanitizedSpecialArrangements as {
        guardian?: {name: string; relation: string};
        pet?: string; digitalAssets?: string; funeral?: string;
        conditionalGifts?: Array<{beneficiary: string; condition: string; asset: string}>;
      },
      medicalWishes: sanitizedMedicalWishes as { lifeSupport?: string; organDonation?: string; palliativeCare?: string },
    });

    let willContent = "";

    // 合规 P0 (2026-06-10): 关闭生成式 AI 文书生成端点
    // - 法规: 《生成式人工智能服务管理暂行办法》(2023-08-15 施行)
    // - 状态: 暂未取得生成式 AI 服务备案 (备案编号: 待申请)
    // - 策略: 强制走模板 fallback 路径, 不调 MiniMax API
    // - 还原: 备案完成后删除此 kill switch, 恢复下方 if 分支
    const AI_SERVICE_COMPLIANCE_KILLED = true;
    if (!AI_SERVICE_COMPLIANCE_KILLED && MINIMAX_API_KEY && MINIMAX_API_KEY !== "") {
      try {
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
          willContent = data.choices?.[0]?.message?.content || "";
        }
      } catch (apiError) {
        console.error("MiniMax API error:", apiError);
        willContent = generateDefaultWill({ name, age, maritalStatus, spouseName, children, assets, heirs });
      }
    } else {
      willContent = generateDefaultWill({ name, age, maritalStatus, spouseName, children, assets, heirs });
    }

    // Authoritative server-side price in 分 (cents). Frontend is ignored.
    const priceCents = getPriceCents(plan) ?? 1990;

    const supabase = getSupabaseClient();

    if (supabase) {
      // 存储到Supabase
      // Batch B (2026-06-09): revision_count 默认 0, 记录已修订次数
      // 降级策略: 先尝试带 revision_count, 失败则不带
      const baseInsert = {
        id: willId,
        name,
        age,
        gender,
        id_card: idCard,
        phone,
        address,
        marital_status: maritalStatus,
        spouse_name: spouseName,
        spouse_id_card: spouseIdCard,
        children: children || [],
        parents: parents || [],
        assets: assets || [],
        heirs: heirs || [],
        special_arrangements: specialArrangements || {},
        medical_wishes: medicalWishes || {},
        will_content: willContent,
        will_content_html: `<pre style="white-space:pre-wrap">${willContent}</pre>`,
        plan: plan || "ai",
        price: priceCents,
        status: "generated",
      };
      const { error } = await supabase.from("wills").insert({
        ...baseInsert,
        revision_count: 0,
      });

      if (error) {
        // 降级: 不带 revision_count 重试一次 (兼容尚未迁移的表)
        if (error.message?.includes('revision_count') || error.code === 'PGRST204') {
          console.warn(`[will] revision_count column missing, retrying without it. Run migration 20260609_add_revision_count.sql`);
          const { error: retryErr } = await supabase.from("wills").insert(baseInsert);
          if (retryErr) console.error(`[will] Supabase insert retry error:`, retryErr);
        } else {
          console.error("Supabase insert error:", error);
        }
      }
    }

    return NextResponse.json({
      id: willId,
      success: true,
      // Batch B: 把过滤统计也返回, 前端可显示 "已忽略 X 条无效信息"
      filterStats: { dropped: filterStats.dropped, total: filterStats.total },
    });
  } catch (error) {
    console.error("Generate will error:", error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: "生成失败" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { code: 'INVALID_REQUEST', error: "缺少ID参数" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("wills")
      .select("*")
      .eq("id", id)
      .maybeSingle();   // P0: .maybeSingle() prevents PGRST116 crash on miss

    if (!error && data) {
      return NextResponse.json({
        id: data.id,
        willContent: data.will_content,
        willContentHtml: data.will_content_html,
        plan: data.plan,
        price: data.price,
        createdAt: data.created_at,
        // Batch B: 把 revision_count 一起返回, 前端用这个判断 "还能不能改"
        revisionCount: data.revision_count ?? 0,
        maxRevisions: 3,
        data: {
          name: data.name,
          age: data.age,
          maritalStatus: data.marital_status,
          spouseName: data.spouse_name,
          children: data.children,
          assets: data.assets,
          heirs: data.heirs,
        },
      });
    }
  }

  return NextResponse.json(
    { code: 'NOT_FOUND', error: "未找到相关记录" },
    { status: 404 }
  );
}

function buildWillPrompt(data: {
  name: string; age: number; maritalStatus?: string; spouseName?: string;
  children?: Array<{name: string; relation: string}>;
  parents?: Array<{name: string; relation: string}>;
  assets?: Array<{type: string; description: string; value?: number}>;
  heirs?: Array<{name: string; relation: string; share: number}>;
  specialArrangements?: {
    guardian?: {name: string; relation: string};
    pet?: string; digitalAssets?: string; funeral?: string;
    conditionalGifts?: Array<{beneficiary: string; condition: string; asset: string}>;
  };
  medicalWishes?: { lifeSupport?: string; organDonation?: string; palliativeCare?: string };
}): string {
  const parts = [];
  parts.push(`请根据以下信息，用专业、庄重的语气生成一份中文遗嘱草稿：`);
  parts.push(`立遗嘱人：${data.name}`);
  parts.push(`年龄：${data.age}岁`);
  if (data.maritalStatus) parts.push(`婚姻状况：${data.maritalStatus}`);
  if (data.spouseName) parts.push(`配偶：${data.spouseName}`);
  if (data.children?.length) parts.push(`子女：${data.children.map(c => `${c.name}（${c.relation}）`).join("、")}`);
  if (data.parents?.length) parts.push(`父母：${data.parents.map(p => `${p.name}（${p.relation}）`).join("、")}`);
  if (data.assets?.length) {
    parts.push(`财产清单：`);
    data.assets.forEach((a, i) => parts.push(`${i+1}. ${a.type}：${a.description}${a.value ? `（估值约${a.value}万元）` : ""}`));
  }
  if (data.heirs?.length) {
    parts.push(`继承人及份额：`);
    data.heirs.forEach((h, i) => parts.push(`${i+1}. ${h.name}（${h.relation}）：${h.share}%`));
  }
  if (data.specialArrangements) {
    if (data.specialArrangements.guardian) parts.push(`指定监护人：${data.specialArrangements.guardian.name}（${data.specialArrangements.guardian.relation}）`);
    if (data.specialArrangements.pet) parts.push(`宠物安排：${data.specialArrangements.pet}`);
    if (data.specialArrangements.digitalAssets) parts.push(`数字遗产：${data.specialArrangements.digitalAssets}`);
    if (data.specialArrangements.funeral) parts.push(`葬礼安排：${data.specialArrangements.funeral}`);
  }
  if (data.medicalWishes) {
    parts.push(`医疗意愿：`);
    if (data.medicalWishes.lifeSupport) parts.push(`- 生命支持：${data.medicalWishes.lifeSupport}`);
    if (data.medicalWishes.organDonation) parts.push(`- 器官捐献：${data.medicalWishes.organDonation}`);
    if (data.medicalWishes.palliativeCare) parts.push(`- 舒缓治疗：${data.medicalWishes.palliativeCare}`);
  }
  parts.push(`请生成一份正式的遗嘱草稿，包含标题、立遗嘱人声明、财产分配、继承人指定、签署日期等标准格式。`);
  parts.push(`语气要庄重、专业，符合中国《民法典》继承编的相关规定。`);
  parts.push(`最后请注明"本遗嘱为AI草稿，不具备法律效力，正式签署前请咨询专业资产规划人员。"`);
  return parts.join("\n");
}

function generateDefaultWill(data: {
  name?: string; age?: number; maritalStatus?: string; spouseName?: string;
  children?: Array<{name: string; relation: string}>;
  assets?: Array<{type: string; description: string}>;
  heirs?: Array<{name: string; relation: string; share: number}>;
}): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  let content = `遗 嘱\n\n立遗嘱人：${data.name || "______"}\n年龄：${data.age || "______"}岁\n身份证号：________________________\n住址：________________________\n\n本人（立遗嘱人）身体健康，头脑清醒，具有完全民事行为能力。现根据《中华人民共和国民法典》继承编的有关规定，特立遗嘱如下：\n\n一、财产状况\n\n`;
  if (data.assets?.length) {
    data.assets.forEach((a, i) => content += `${i+1}. ${a.type}：${a.description}\n`);
  } else {
    content += `1. 房产：________________________\n2. 存款：________________________\n3. 其他财产：________________________\n`;
  }
  content += `\n二、财产分配\n\n`;
  if (data.heirs?.length) {
    data.heirs.forEach((h, i) => content += `${i+1}. ${h.name}（${h.relation}），继承份额：${h.share}%\n`);
  } else {
    content += `1. ________________________（关系：______），继承份额：______%\n2. ________________________（关系：______），继承份额：______%\n`;
  }
  content += `\n三、其他安排\n\n`;
  if (data.spouseName) content += `1. 对于配偶${data.spouseName}的扶养安排，按照法律规定执行。\n`;
  content += `2. 本人去世后，丧葬事宜由________________________负责安排。\n3. 其他未尽事宜，按照相关法律法规执行。\n\n四、附则\n\n本遗嘱为本人真实意思表示，未受任何胁迫或欺诈。\n本遗嘱一式三份，本人保留一份，公证处存档一份，遗嘱执行人保存一份。\n\n立遗嘱人签名：________________________\n\n${dateStr}\n\n---\n\n【重要提示】\n本遗嘱为标准模板生成版本，不具备法律效力。\n正式签署前，请咨询专业资产规划人员，确保遗嘱符合《中华人民共和国民法典》的相关规定，并办理必要的公证手续。\n`;
  return content;
}
