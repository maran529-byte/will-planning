-- 遗嘱项目 Supabase 数据库 Schema
-- 运行位置：Supabase Dashboard -> SQL Editor

-- 1. 遗嘱草稿表
CREATE TABLE wills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 基本信息
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  id_card TEXT,
  phone TEXT,
  address TEXT,
  
  -- 家庭状况
  marital_status TEXT,           -- 未婚/已婚/离异/丧偶
  spouse_name TEXT,
  spouse_id_card TEXT,
  children JSONB,                -- [{name: string, relation: string, age: number}]
  parents JSONB,                 -- [{name: string, relation: string}]
  
  -- 财产信息
  assets JSONB,                  -- [{type: string, description: string, value: number, location: string}]
  total_asset_value INTEGER,     -- 总估值（万元）
  
  -- 继承人信息
  heirs JSONB,                   -- [{name: string, relation: string, share: number, contact: string}]
  
  -- 特殊安排
  special_arrangements JSONB,   -- {
                                   --   guardian: {name, relation},
                                   --   pet: string,
                                   --   digital_assets: string,
                                   --   funeral: string,
                                   --   conditional_gifts: [{beneficiary, condition, asset}]
                                   -- }
  
  -- 医疗意愿
  medical_wishes JSONB,          -- {
                                   --   life_support: string,
                                   --   organ_donation: string,
                                   --   palliative_care: string
                                   -- }
  
  -- AI生成内容
  will_content TEXT,
  will_content_html TEXT,
  
  -- 套餐信息
  plan TEXT DEFAULT 'ai' CHECK (plan IN ('ai', 'lawyer', 'family')),  -- ai/ lawyer/ family
  price INTEGER DEFAULT 199,
  
  -- 支付状态
  paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,           -- wechat/ alipay/ bank
  
  -- 律师关联
  lawyer_id UUID REFERENCES lawyers(id),
  lawyer_review_status TEXT DEFAULT 'pending' CHECK (lawyer_review_status IN ('pending', 'reviewed', 'approved', 'rejected')),
  lawyer_review_notes TEXT,
  lawyer_review_at TIMESTAMPTZ,
  
  -- 微信相关信息
  wechat_openid TEXT,
  wechat_unionid TEXT,
  
  -- 状态
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'paid', 'reviewed', 'completed')),
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 订单表
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  will_id UUID REFERENCES wills(id) ON DELETE SET NULL,
  
  order_no TEXT UNIQUE NOT NULL,  -- 订单号
  amount INTEGER NOT NULL,         -- 金额（分）
  plan TEXT NOT NULL,              -- ai/ lawyer/ family
  
  -- 支付信息
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded', 'cancelled')),
  paid_at TIMESTAMPTZ,
  payment_channel TEXT,           -- wechat/ alipay
  
  -- 微信支付相关
  wechat_prepay_id TEXT,
  wechat_transaction_id TEXT,
  
  -- 退款信息
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 律师表
CREATE TABLE lawyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  
  -- 执业信息
  license_no TEXT,                -- 律师执照号
  firm_name TEXT,                 -- 律所名称
  years_experience INTEGER,       -- 从业年限
  
  -- 专长领域
  expertise JSONB,                -- ["继承", "房产", "婚姻家庭"]
  
  -- 审核状态
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'removed')),
  
  -- 结算信息
  bank_account TEXT,
  bank_name TEXT,
  
  -- 统计数据
  total_reviews INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 律师排班表
CREATE TABLE lawyer_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE,
  
  date DATE NOT NULL,
  time_slots JSONB,               -- ["09:00", "10:00", "14:00", "15:00"]
  
  is_available BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lawyer_id, date)
);

-- 5. 预约记录表
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  will_id UUID REFERENCES wills(id) ON DELETE SET NULL,
  lawyer_id UUID REFERENCES lawyers(id) ON DELETE SET NULL,
  
  appointment_date DATE NOT NULL,
  appointment_time TEXT NOT NULL,  -- "09:00"
  
  -- 预约状态
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  
  -- 会议信息
  meeting_link TEXT,              -- 视频会议链接
  meeting_id TEXT,
  
  -- 备注
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 用户表（可选，用于登录）
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  phone TEXT UNIQUE NOT NULL,
  wechat_openid TEXT UNIQUE,
  wechat_unionid TEXT,
  
  -- 角色
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'lawyer', 'admin')),
  
  -- 统计
  total_wills INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX idx_wills_phone ON wills(phone);
CREATE INDEX idx_wills_wechat_openid ON wills(wechat_openid);
CREATE INDEX idx_wills_status ON wills(status);
CREATE INDEX idx_wills_plan ON wills(plan);
CREATE INDEX idx_wills_created_at ON wills(created_at DESC);

CREATE INDEX idx_orders_order_no ON orders(order_no);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_will_id ON orders(will_id);

CREATE INDEX idx_lawyers_phone ON lawyers(phone);
CREATE INDEX idx_lawyers_status ON lawyers(status);

CREATE INDEX idx_appointments_will_id ON appointments(will_id);
CREATE INDEX idx_appointments_lawyer_id ON appointments(lawyer_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);

-- Row Level Security (RLS) - 重要：保护用户数据
ALTER TABLE wills ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 遗嘱：用户只能查看自己的
CREATE POLICY "Users can view own wills" ON wills
  FOR SELECT USING (phone = current_setting('request.jwt.claims', true)::jsonb->>'phone');

CREATE POLICY "Users can insert own wills" ON wills
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own wills" ON wills
  FOR UPDATE USING (phone = current_setting('request.jwt.claims', true)::jsonb->>'phone');

-- 律师：只有管理员可以管理
CREATE POLICY "Admins can manage lawyers" ON lawyers
  FOR ALL USING (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'admin');

-- 预约：用户只能查看自己的
CREATE POLICY "Users can view own appointments" ON appointments
  FOR SELECT USING (
    will_id IN (SELECT id FROM wills WHERE phone = current_setting('request.jwt.claims', true)::jsonb->>'phone')
  );

-- 自动更新时间戳的函数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 应用触发器
CREATE TRIGGER update_wills_updated_at BEFORE UPDATE ON wills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_lawyers_updated_at BEFORE UPDATE ON lawyers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
