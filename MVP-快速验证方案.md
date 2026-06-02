# 遗嘱项目 MVP 快速验证方案

## 核心目标

用最小成本验证目标用户（50-70岁子女、中年高净值人士）是否愿意为"AI遗嘱草稿+律师审核"服务付费。

---

## 一、技术方案（当前进度）

### 已完成开发

| 页面/功能 | 文件位置 | 状态 |
|---------|---------|------|
| 落地页（含定价、CTA） | `src/app/page.tsx` | ✅ 完成 |
| AI遗嘱问卷（7模块25题） | `src/app/questionnaire/page.tsx` | ✅ 完成 |
| 结果页（草稿预览+律师预约入口） | `src/app/result/page.tsx` | ✅ 完成 |
| MiniMax API 遗嘱生成 | `src/app/api/generate-will/route.ts` | ✅ 完成 |

### 定价结构

| 套餐 | 价格 | 说明 |
|-----|------|-----|
| AI引导版 | ¥199 | 问卷+AI生成草稿+PDF下载 |
| 律师审核版 | ¥699 | AI草稿+律师30分钟视频审核+签署指引 |
| 家族传承版 | ¥3999/年 | 全家族规划+年度律师顾问 |

### 当前架构

```
用户浏览器
    ↓
Next.js App (Vercel部署)
    ├── / (落地页)
    ├── /questionnaire (AI问卷，7模块25题)
    ├── /result?id=xxx (草稿预览)
    └── /api/generate-will (MiniMax API调用)
                                      ↓
                               MiniMax M2.7 (遗嘱内容生成)
```

⚠️ 当前存储：内存Map（进程重启即丢失，MVP验证用）

---

## 二、快速上线步骤（剩余工作）

### Step 1: 配置 Supabase 数据库（约1小时）

```bash
# 1. 创建 Supabase 项目
# https://supabase.com

# 2. 创建数据表
CREATE TABLE wills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER,
  marital_status TEXT,
  spouse_name TEXT,
  children JSONB,          -- [{name, relation}]
  parents JSONB,            -- [{name, relation}]
  assets JSONB,             -- [{type, description, value}]
  heirs JSONB,              -- [{name, relation, share}]
  special_arrangements JSONB,
  medical_wishes JSONB,
  will_content TEXT,
  plan TEXT DEFAULT 'ai',   -- 'ai' | 'lawyer' | 'family'
  price INTEGER,
  paid BOOLEAN DEFAULT false,
  lawyer_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  will_id UUID REFERENCES wills(id),
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending | paid | refunded
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Supabase 费用：免费**（PostgreSQL免费配额：500MB存储，5万月活用户）

### Step 2: 配置环境变量

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
MINIMAX_API_KEY=sk-xxx
```

### Step 3: Vercel 部署（约30分钟）

```bash
cd ~/will-planning
npm install
vercel --prod
# 按提示绑定GitHub仓库
```

**Vercel 费用：免费**（Hobby计划：100GB带宽，100小时/月serverless函数）

### Step 4: 微信小程序绑定（可选，MVP阶段用H5即可）

MVP阶段直接用落地页URL做分享，不需要微信小程序。

如需小程序：
- 注册微信公众平台（个人主体也可注册订阅号）
- 使用`wxmini-api`将Next.js网页内嵌

---

## 三、费用清单

| 项目 | 服务商 | 方案 | 月费用 | 年费用 | 说明 |
|-----|-------|------|-------|-------|-----|
| 前端+API托管 | Vercel | Hobby | ¥0 | ¥0 | 100小时serverless，足够MVP |
| 数据库 | Supabase | Free | ¥0 | ¥0 | 500MB，足够早期验证 |
| AI遗嘱生成 | MiniMax | 5小时套餐 | ¥19.9 | ¥1034 | 10x周配额，实测~50TPS |
| 域名 | 阿里云/腾讯云 | 普通域名 | ¥30-50 | ¥30-50 | will-family.cn 等 |
| 微信支付 | 微信支付 | 企业/个体户 | ¥0 | ¥0 | 0.6%交易手续费 |
| 律师佣金 | - | 60%归律师 | - | - | ¥699套餐律师拿¥419 |

**MVP验证总成本：约¥30-50（域名）**

---

## 四、验证逻辑（关键）

### 如何验证用户付费意愿

1. **直接收费测试**：落地页直接显示¥199/¥699价格，观察转化率
2. **最小MVP**：只提供AI引导版¥199，砍掉复杂定价，专注一个套餐
3. **成功标准**：
   - 7天内获得10个付费用户 → 产品需求被验证
   - 7天内获得0个付费用户 → 需要重新审视定价或目标用户

### 快速迭代方式

```
第1周：上线¥199 AI引导版，观察付费转化
第2周：根据数据调整 → 加¥699律师审核版，或降价/涨价
第3周：确认一个主力套餐后，再开发完整三版本
```

---

## 五、技术栈总结

| 层级 | 技术 | 费用 |
|-----|-----|-----|
| 前端框架 | Next.js (App Router) | ¥0 |
| 样式 | Tailwind CSS | ¥0 |
| 部署 | Vercel | ¥0 |
| 数据库 | Supabase PostgreSQL | ¥0 |
| AI生成 | MiniMax M2.7 API | ¥19.9/月起 |
| 域名 | 阿里云/腾讯云 | ¥30/年起 |
| **合计** | | **¥30+** |

---

## 六、风险与注意事项

1. **AI遗嘱不具备法律效力**：所有页面和AI生成内容需明确标注"本内容为AI草稿，不具备法律效力"
2. **微信支付需要企业资质**：个人开发者暂时无法接入真实微信支付，MVP阶段可用收款码或预付款形式
3. **数据隐私**：用户遗嘱信息属于敏感数据，需配置Supabase Row Level Security (RLS)
4. **MiniMax API稳定性**：生产环境建议增加fallback逻辑，当前已实现

---

## 七、下一步行动

- [ ] 注册 Supabase，创建项目和数据表
- [ ] 配置 `.env.local` 环境变量
- [ ] Vercel 部署并绑定自定义域名
- [ ] 将落地页URL通过微信/朋友圈分享，开始收集前10个付费用户
