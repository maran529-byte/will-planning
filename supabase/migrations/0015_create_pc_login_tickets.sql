-- =============================================================================
-- Migration 0015: PC 端扫码登录票据 (改版 v13, 2026-06-29)
-- =============================================================================
-- 背景: PC 浏览器无法直接走微信 OAuth, 需要一个"扫码 + 验证码"机制:
--   1. PC 端生成 ticket + 8 位验证码
--   2. 用户用手机微信扫码关注公众号
--   3. 公众号内回复【PC】→ 后端查到该 ticket 关联的 openid
--   4. 公众号推送 8 位验证码到用户微信
--   5. 用户在 PC 端输入验证码 → 后端校验通过 → 写 cookie → 跳 dashboard
--
-- 设计:
--   - ticket:  16 字符 URL safe base64, 唯一, 公开给 PC 端用于轮询状态
--   - code:    8 位大写字母数字验证码, 公众号推送给用户
--   - openid:  公众号内确认时填充
--   - status:  pending → confirmed → consumed
--              pending: 等待用户在公众号内确认
--              confirmed: 验证码已校验, cookie 待发放
--              consumed: cookie 已发放, ticket 失效
--              expired:  5 分钟未操作, 自动过期
--   - return_to: 登录成功后跳转目标
--   - 一次性消费, 5 分钟过期
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.pc_login_tickets (
  ticket        TEXT PRIMARY KEY,
  code          CHAR(8) NOT NULL,
  openid        TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'confirmed', 'consumed', 'expired', 'cancelled')),
  user_id       UUID,                -- confirmed 后填充, 关联 users.id
  return_to     TEXT,
  user_agent    TEXT,
  ip_address    TEXT,
  attempts      INTEGER NOT NULL DEFAULT 0,
  max_attempts  INTEGER NOT NULL DEFAULT 5,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at  TIMESTAMPTZ,
  consumed_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 minutes')
);

CREATE INDEX IF NOT EXISTS idx_pc_login_tickets_code
  ON public.pc_login_tickets(code);

CREATE INDEX IF NOT EXISTS idx_pc_login_tickets_status_expires
  ON public.pc_login_tickets(status, expires_at);

CREATE INDEX IF NOT EXISTS idx_pc_login_tickets_openid
  ON public.pc_login_tickets(openid, status);

-- RLS: 不开放前端读写, 全部由 service_role 走
ALTER TABLE public.pc_login_tickets ENABLE ROW LEVEL SECURITY;
-- 默认拒绝所有 anon/authenticated 访问
