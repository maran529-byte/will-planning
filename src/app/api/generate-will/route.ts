import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { MINIMAX_API_KEY, MINIMAX_BASE_URL, MINIMAX_MODEL } from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getPriceCents } from "@/lib/pricing";

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
  plan: z.enum(['ai', 'lawyer', 'family']).default('ai'),
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

    // 构建prompt
    const prompt = buildWillPrompt({
      name, age, maritalStatus, spouseName, children, parents, assets, heirs,
      specialArrangements, medicalWishes,
    });

    let willContent = "";

    // 尝试调用MiniMax API
    if (MINIMAX_API_KEY && MINIMAX_API_KEY !== "") {
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
      const { error } = await supabase.from("wills").insert({
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
      });

      if (error) {
        console.error("Supabase insert error:", error);
        // 继续运行，使用内存存储作为fallback
      }
    }

    return NextResponse.json({ id: willId, success: true });
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
  parts.push(`最后请注明"本遗嘱为AI草稿，不具备法律效力，正式签署前请咨询专业律师。"`);
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
  content += `2. 本人去世后，丧葬事宜由________________________负责安排。\n3. 其他未尽事宜，按照相关法律法规执行。\n\n四、附则\n\n本遗嘱为本人真实意思表示，未受任何胁迫或欺诈。\n本遗嘱一式三份，本人保留一份，公证处存档一份，遗嘱执行人保存一份。\n\n立遗嘱人签名：________________________\n\n${dateStr}\n\n---\n\n【重要提示】\n本遗嘱为AI生成的草稿版本，不具备法律效力。\n正式签署前，请咨询专业律师进行审核，确保遗嘱符合《中华人民共和国民法典》的相关规定，并办理必要的公证手续。\n`;
  return content;
}
