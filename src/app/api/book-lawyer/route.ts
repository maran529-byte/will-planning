import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getOpenidFromCookie } from "@/lib/cookie";

const bookLawyerSchema = z.object({
  willId: z.string().uuid().optional(),
  name: z.string().min(1, "姓名必填").max(64, "姓名过长"),
  phone: z
    .string()
    .regex(/^1[3-9]\d{9}$/, "手机号格式错误")
    .or(z.literal("").transform(() => undefined))
    .optional(),
  preferTime: z.string().max(64).optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const openid = await getOpenidFromCookie();
    if (!openid) {
      return NextResponse.json(
        { code: "UNAUTHENTICATED", error: "请先通过公众号登录" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = bookLawyerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "INVALID_REQUEST",
          error: "缺少或无效的参数",
          issues: parsed.error.issues.map((i) => ({
            path: i.path,
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const { willId, name, phone, preferTime, notes } = parsed.data;

    console.log(
      "[book-lawyer] openid=",
      openid.slice(0, 8) + "***",
      "willId=",
      willId
    );

    if (supabaseAdmin) {
      const insertRow: Record<string, unknown> = {
        user_openid: openid,
        will_id: willId ?? null,
        contact_name: name,
        contact_phone: phone ?? null,
        prefer_time: preferTime ?? null,
        notes: notes ?? null,
        status: "pending",
      };

      const { data, error } = await supabaseAdmin
        .from("lawyer_bookings")
        .insert(insertRow)
        .select("id")
        .maybeSingle();

      if (error) {
        console.error(
          "[book-lawyer] Supabase insert error:",
          error.code,
          error.message
        );
        return NextResponse.json(
          { code: "DB_ERROR", error: "服务暂时不可用，请稍后重试" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        bookingId: data?.id ?? null,
        message: "预约成功，专业资产规划人员将在 24 小时内联系您",
      });
    }

    return NextResponse.json({
      success: true,
      bookingId: null,
      message: "预约成功，专业资产规划人员将在 24 小时内联系您",
      devMode: true,
    });
  } catch (error) {
    console.error("[book-lawyer] error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", error: "预约失败" },
      { status: 500 }
    );
  }
}
