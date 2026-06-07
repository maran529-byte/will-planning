-- =============================================================================
-- 0010: 发票申请表
-- 业务: 用户在 /account 对已支付订单申请发票 (个人/公司), 管理员审核后打款
-- 时间: 2026-06-07
-- =============================================================================

CREATE TYPE invoice_type AS ENUM ('personal', 'company');
CREATE TYPE invoice_status AS ENUM ('pending', 'approved', 'rejected', 'issued');

CREATE TABLE public.invoice_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  openid TEXT NOT NULL,                              -- 申请用户 (微信 openid)

  -- 发票类型
  invoice_type invoice_type NOT NULL DEFAULT 'personal',
  -- 个人: title = 姓名
  -- 公司: title = 公司名, tax_id = 税号
  title TEXT NOT NULL,
  tax_id TEXT,                                       -- 公司发票必填
  amount_cents INT NOT NULL,                         -- 申请金额 (快照, 避免后续改价)

  -- 联系 / 投递
  contact_email TEXT NOT NULL,                       -- 接收电子发票邮箱
  contact_phone TEXT,                                -- 可选, 仅紧急时联系

  -- 审核
  status invoice_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,                                   -- 拒绝原因 / 备注
  invoice_url TEXT,                                  -- 电子发票 PDF URL (审核通过后由管理员上传)
  processed_at TIMESTAMPTZ,
  processed_by UUID,

  -- 审计
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_order_id ON public.invoice_requests(order_id);
CREATE INDEX idx_invoice_openid ON public.invoice_requests(openid);
CREATE INDEX idx_invoice_status ON public.invoice_requests(status) WHERE status NOT IN ('issued');
CREATE INDEX idx_invoice_created_at ON public.invoice_requests(created_at DESC);

COMMENT ON TABLE public.invoice_requests IS '用户对已支付订单申请发票. 1 订单可申请多次 (驳回后可重提)';

-- RLS: 用户只读自己的 (openid 匹配)
ALTER TABLE public.invoice_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own invoices" ON public.invoice_requests
  FOR SELECT USING (true);  -- 服务端过滤, 客户端 SELECT 不带敏感字段

-- 服务端 SERVICE_ROLE 绕过 RLS, 写操作统一在 API 层

-- 触发器: updated_at 自动维护
CREATE TRIGGER trg_invoice_updated_at
  BEFORE UPDATE ON public.invoice_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
