-- =============================================================================
-- Migration 0014: 短信/邮箱验证码 (改版 v9, 2026-06-28)
-- =============================================================================
-- 背景: 增加手机号 + 验证码登录入口, 验证码通过国内短信服务 (腾讯云 SMS)
--       或邮件 (Supabase SMTP) 发送给用户. 验证码存本表, 5 分钟内有效.
--
-- 设计:
--   - channel: 'sms' | 'email', 支持多通道
--   - target:  手机号 / 邮箱
--   - code:    6 位数字 (存 hash 提升安全, 验证时 hash 比对)
--   - consumed: 验证成功后置 true, 一次性
--   - expires_at: 创建时间 + 5 分钟
--   - attempts: 验证尝试次数 (防爆破, 5 次锁)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  target TEXT NOT NULL,                -- 手机号或邮箱
  code_hash TEXT NOT NULL,             -- SHA-256(code + server_salt)
  purpose TEXT NOT NULL DEFAULT 'login' CHECK (purpose IN ('login', 'register', 'reset')),
  consumed BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 minutes')
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_target ON public.otp_codes(target, channel, consumed);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON public.otp_codes(expires_at);

-- 自动清理过期验证码 (10 分钟一次)
-- 注释: Supabase pg_cron 需启用, 本 migration 仅建表, 清理由后端 cron 触发
-- (避免引入 pg_cron 扩展依赖)

-- RLS: 不开放前端读写, 全部由 service_role 走
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- 不创建任何 RLS 策略 → 默认拒绝所有 anon/authenticated 访问
-- 仅 service_role (服务端 API) 可读写
