# GA4 Data API 配置指南 (流量分析用)

## 问题
当前 `~/.aiwill/scripts/traffic_analysis.py` 需要调用 GA4 Data API
拉取历史流量数据 (sessions/pageviews), 但缺少 Service Account 凭证。

已安装: `google-analytics-data==0.20.0` (whisper-env)

## 解决方案 (2 选 1)

### 🟢 方案 A: 创建 Service Account (推荐, 5 分钟)

**步骤**:
1. 打开 GCP 控制台
   https://console.cloud.google.com/iam-admin/serviceaccounts?project=YOUR_PROJECT

2. 选项目 (家有所爱 GA4 关联的项目) → **+ 创建服务账号**
   - 名称: `aiwill-traffic-reader`
   - 描述: "读取家有所爱 GA4 流量数据"
   - 角色: 不需要 (跳过)

3. 创建完成后 → **密钥** 标签 → **添加密钥** → **JSON**
   - 下载 `aiwill-traffic-reader-xxxxx.json` 到 `~/.aiwill/ga4_credentials.json`

4. 打开 GA4 控制台
   https://analytics.google.com/analytics/web/#/<PROPERTY_ID>/admin/access

5. 找到刚创建的 Service Account 邮箱 (形如
   `aiwill-traffic-reader@xxx.iam.gserviceaccount.com`)

6. **添加** → 角色: **查看者** (Viewer) → 确认

7. 编辑 `~/.aiwill/config.json`:
   ```json
   {
     "analytics": {
       "ga4_property_id": "123456789",  // GA4 数字 ID
       "ga4_credentials_file": "~/.aiwill/ga4_credentials.json"
     }
   }
   ```

8. 测试: `python3 ~/.aiwill/scripts/traffic_analysis.py`

### 🟡 方案 B: 仅用 Measurement Protocol (简单, 无历史报告)

只追踪**关键事件** (订单/Agent/GEO 评分) — 已有方案。
- 优点: 0 配置
- 缺点: **没有** session/pageview/跳出率等历史数据
- GA4 控制台 → 报告 → 实时 → 可见最近 30 分钟事件
- GA4 控制台 → 报告 → 参与度 → 事件 → 可见累计事件数

如果暂时不需要深度流量分析, 用方案 B 已够用。

## 现状
- ✅ `google-analytics-data` 已安装
- ✅ `google-analytics` Measurement Protocol API 密钥已就绪
- ⚠️ 缺 Service Account JSON
- ⚠️ 缺 GA4 Property ID (数字, 不是 G-XXX)

## 找到 GA4 Property ID
1. https://analytics.google.com/
2. 选家有所爱 GA4 账号
3. **管理** (左下齿轮) → **账号设置** → 复制**数字属性 ID**
   (例如 `123456789`)
