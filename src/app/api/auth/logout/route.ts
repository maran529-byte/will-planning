import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(_request: NextRequest) {
  const cookieStore = await cookies();
  const response = NextResponse.json({ code: 'OK', message: '已退出登录' });
  response.cookies.delete('sb-access-token');
  response.cookies.delete('sb-refresh-token');
  response.cookies.delete('user_session');
  cookieStore.delete('sb-access-token');
  cookieStore.delete('sb-refresh-token');
  cookieStore.delete('user_session');
  return response;
}

export async function GET(_request: NextRequest) {
  return POST(_request);
}