/**
 * 短信发送抽象层 (改版 v9, 2026-06-28).
 *
 * 设计:
 *  - 优先调用腾讯云 SMS (国内主通道, 适合中国大陆手机号)
 *  - 未配置时降级为「开发模式」: 直接在服务端 console 输出验证码
 *  - 永远不抛错给前端 (验证码是「福利性」服务, 失败也不阻塞登录主流程)
 *
 * 配置:
 *  TENCENT_SMS_SECRET_ID    API 密钥 ID
 *  TENCENT_SMS_SECRET_KEY   API 密钥 Key
 *  TENCENT_SMS_APP_ID       短信应用 ID
 *  TENCENT_SMS_TEMPLATE_ID  模板 ID (需在腾讯云控制台审核通过)
 *  TENCENT_SMS_SIGN         短信签名 (如「家有所爱」)
 *
 * 占位: 实际接入时需要 npm i tencentcloud-sdk-nodejs-sms
 *       本文件先做接口预留, 真实发送逻辑放到 v9.1
 */

const TENCENT_SMS_SECRET_ID = process.env.TENCENT_SMS_SECRET_ID || '';
const TENCENT_SMS_SECRET_KEY = process.env.TENCENT_SMS_SECRET_KEY || '';
const TENCENT_SMS_APP_ID = process.env.TENCENT_SMS_APP_ID || '';
const TENCENT_SMS_TEMPLATE_ID = process.env.TENCENT_SMS_TEMPLATE_ID || '';
const TENCENT_SMS_SIGN = process.env.TENCENT_SMS_SIGN || '家有所爱';

export interface SendSmsResult {
  ok: boolean;
  /** 短信服务商返回的 request id, 用于对账 */
  requestId?: string;
  /** 失败时的错误信息 (开发模式时为空, 因为不算失败) */
  error?: string;
  /** 是否走开发模式 (dev 控制台输出而非真实发送) */
  devMode: boolean;
}

/**
 * 发送短信验证码.
 * 失败时永远返回 ok=false, 不抛异常 (业务层会走降级).
 */
export async function sendSmsCode(phone: string, code: string): Promise<SendSmsResult> {
  const configured = Boolean(
    TENCENT_SMS_SECRET_ID && TENCENT_SMS_SECRET_KEY && TENCENT_SMS_APP_ID && TENCENT_SMS_TEMPLATE_ID,
  );

  if (!configured) {
    // 开发模式: 输出到服务端日志. 部署时配合日志收集 (Vercel Logs / Tencent CLS).
    // ⚠️ 严禁返回给前端明文验证码, 防止 XSS / 客户端日志泄露.
    console.log(`[SMS-DEV] phone=${maskPhone(phone)} code=${code} sign=${TENCENT_SMS_SIGN}`);
    return { ok: true, devMode: true };
  }

  // TODO v9.1: 调用腾讯云 SMS SDK
  // import * as tencentcloud from 'tencentcloud-sdk-nodejs-sms';
  // const client = new tencentcloud.sms.v20210111.Client({...});
  // await client.SendSms({...});
  // 现阶段保留接口, 不阻塞主流程
  try {
    // 占位: 实际接入后这里调用 SDK
    return { ok: true, devMode: false };
  } catch (err) {
    return {
      ok: false,
      devMode: false,
      error: err instanceof Error ? err.message : '短信发送失败',
    };
  }
}

function maskPhone(phone: string): string {
  if (phone.length < 7) return '***';
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}
