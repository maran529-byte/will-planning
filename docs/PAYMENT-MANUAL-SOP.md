# 「个人微信收款」运营 SOP

> 编制: Ops / Master Agent
> 日期: 2026-06-07
> 适用基线: commit `3433183` + Phase 1 改动
> 目标读者: 管理员 (运营者本人) + 客服

---

## 0. 这是什么

aiwill-planner MVP 阶段 (Phase 1) 暂不接入微信支付商户号 (1-3 周审核 + 资料), 改用**「个人微信收款码 + 人工确认」**方式跑通全流程。客户在 `/payment` 页面看到管理员的微信收款码, 扫码付款后, **管理员在 `/admin/orders` 手动 mark paid** 完成订单确认。

**合规说明**: 月 GMV < ¥5 万无监管风险。超过此线强烈建议立刻申请商户号 (Phase 5)。

---

## 1. 一次性准备 (5 分钟)

### 1.1 截图管理员的微信收款码

1. 打开微信 → 「我」→ 「服务」→ 「钱包」→ 「收付款」→ 「二维码收款」
2. **设置金额**: 选「固定金额」→ 输入 ¥19.90 (保存常用金额)
3. **截图**: 长按二维码 → 保存到相册 (建议分辨率 ≥ 400×400 px)

### 1.2 上传到 Vercel

**方法 A: 直接放到仓库 (推荐)**

```bash
# 把截图重命名为 payment-qr.png
mv ~/Downloads/wx_qr.png /Users/maran/aiwill-planner/public/payment-qr.png

# 删除占位 SVG
rm /Users/maran/aiwill-planner/public/payment-qr-placeholder.svg

# 提交 + 推送
git add public/payment-qr.png
git commit -m "feat(phase1): 管理员微信收款码"
git push origin main
```

**方法 B: 传到云存储 (更灵活)**

1. 上传到 Cloudflare R2 / 阿里云 OSS / 腾讯云 COS
2. 拿到公开 URL (形如 `https://cdn.example.com/payment-qr.png`)
3. 在 Vercel Dashboard 设置环境变量:

```
PUBLIC_PAYMENT_QR_URL = https://cdn.example.com/payment-qr.png
```

### 1.3 验证

```bash
# 访问 Vercel 部署的站点
open https://aiwill-planner.vercel.app/payment-qr.png

# 应该看到二维码图片 (不是占位 SVG)
```

---

## 2. 日常运营流程 (客户视角)

### 2.1 客户下单 → 看到收款码

1. 客户访问 `https://aiwill-planner.cn/questionnaire`
2. 填写问卷 → 点「立即生成」 → 进入 `/result`
3. 看到「¥19.9 下载完整版」按钮 → 点击 → 进入 `/payment`
4. 看到订单摘要 + 应付金额 ¥19.9 + 订单号 `ORDxxxx`
5. 点「扫码支付」按钮 → 弹出二维码弹窗
6. 看到:
   - 二维码图片 (管理员的微信收款码)
   - 「订单号 `ORDxxxx`」水印 (客户需留言)
   - 应付金额 ¥19.9
   - 「我已支付 · 请客服确认」按钮

### 2.2 客户扫码 + 留言订单号

1. 客户用微信「扫一扫」扫描二维码
2. 输入金额 ¥19.90
3. **关键**: 在留言/备注栏填写订单号 `ORDxxxx` (这是管理员对账的唯一凭证)
4. 点击「付款」 → 输入支付密码
5. 回到 `/payment` 页面 → 点「我已支付 · 请客服确认」
6. 页面显示「正在等待订单确认...」 (30 秒内会有结果)
7. 客户可关闭页面, 也可以加客服微信并发送订单号 + 截图

---

## 3. 管理员操作流程 (Phase 1 临时方案)

> **正式方案在 Phase 3** (管理员后台 `/admin/orders`)。Phase 1 期间 (1-2 天过渡), 管理员直接用 Supabase Dashboard 操作。

### 3.1 Phase 1 临时 (Supabase SQL 操作)

1. 客户微信提示音响起, 收到 ¥19.90
2. 查看微信收款记录: 微信 → 「我」→ 「服务」→ 「钱包」→ 「账单」→ 找到对应 ¥19.90 → 看备注/留言
3. **从留言拿到订单号** `ORDxxxx` (若无留言, 让客户补)
4. 打开 Supabase Dashboard → `orders` 表 → 找到该 order_no 的行
5. 手动修改:
   - `status`: `pending` → `paid`
   - `paid_at`: 设为当前时间戳 (格式 `2026-06-07 14:32:00+00`)
   - `payment_channel`: `null` → `manual`
   - `payment_method`: `null` → `wechat_personal` 或 `alipay_personal`
6. 客户 30s 内看到状态变化 → 显示「支付成功」页面

### 3.2 Phase 3 上线后 (推荐)

> Phase 3 预计 2-3 天内上线, 上线后用这个流程。

1. 客户微信提示音响起
2. 打开 `https://aiwill-planner.vercel.app/admin/orders` (管理员后台)
3. 看到「待支付」订单列表 → 找到对应订单 (按订单号搜索)
4. 点「标记已支付」按钮 → 自动 mark paid + 通知客户
5. 客户 30s 内看到状态变化

---

## 4. 异常处理

### 4.1 客户忘记留言订单号

**风险**: 管理员无法对账, 钱进了但订单还在 pending。

**处理**:
1. 让客户在订单列表页 (`/orders`) 找订单号 (因 openid 已绑定)
2. 或加客服微信, 客服帮客户查 (客服在 Supabase 用 openid 查 `orders` 表)

### 4.2 客户多付 / 少付

**风险**: 客户付款金额与订单不一致。

**处理**:
1. **多付**: 联系客户退款 (微信转账退回差额), 不动订单
2. **少付**: 联系客户补足, 或在 Supabase 标 `cancelled`, 客户重新下单

### 4.3 管理员误 mark paid

**处理**:
1. Supabase SQL 改回: `status = 'paid' → 'cancelled'`
2. 客户 `/orders` 看到订单取消 → 重新下单

### 4.4 二维码图片加载失败

**检查顺序**:
1. `PUBLIC_PAYMENT_QR_URL` env 是否配
2. 文件路径 `public/payment-qr.png` 是否存在
3. Vercel 部署是否包含该文件 (看 Vercel build log)
4. 直接访问 `https://aiwill-planner.vercel.app/payment-qr.png` 看是否 200

---

## 5. 进阶 (Phase 3 之后)

Phase 3 上线后, 此 SOP 大部分流程会被 `/admin/orders` 取代。本文档保留作为:
- 应急手册 (admin 后台挂了时回退到此流程)
- 培训材料 (新客服 onboarding)
- 商户号申请完成后的对照参考 (Phase 5 切换时核对)

---

## 6. 关键文件索引

| 文件 | 作用 |
|------|------|
| `src/lib/payment.ts:52-67` | `buildManualPayment()` - 构造 manual 支付结果 |
| `src/lib/payment.ts:42-44` | `isManualPaymentConfigured()` - 检测是否启用 manual |
| `src/lib/orders.ts:198-235` | `markOrderPaidManually()` - 手动 mark paid (Phase 3 调) |
| `src/app/api/payment/route.ts:22-26` | zod schema 接受 channel='manual' |
| `src/app/payment/page.tsx:81-111` | `startPayment('manual')` 调 /api/payment 拿 QR |
| `public/payment-qr.png` | 管理员个人微信收款码 (待上传) |

---

**SOP 结束 · Version 1.0 · 2026-06-07 · 编制者: Master Agent**
