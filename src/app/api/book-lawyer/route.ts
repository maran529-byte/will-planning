import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { willId, name, phone, preferTime, notes } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "姓名和手机号必填" }, { status: 400 });
    }

    // 生成预约ID
    const bookingId = uuidv4();

    // 实际项目中，这里应该：
    // 1. 将预约信息存入数据库
    // 2. 发送短信/微信通知给律师
    // 3. 发送确认短信给用户

    return NextResponse.json({
      success: true,
      bookingId,
      message: "预约成功，律师将在24小时内联系您",
      // 模拟预约详情
      booking: {
        id: bookingId,
        willId,
        name,
        phone,
        preferTime: preferTime || "工作日9:00-18:00",
        status: "pending",
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Book lawyer error:", error);
    return NextResponse.json({ error: "预约失败" }, { status: 500 });
  }
}
