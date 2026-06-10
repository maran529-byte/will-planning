# 公众号配置指南 (Day 1 上线)

> 目标: 5 分钟内激活"家有所爱"公众号服务器回调 + 菜单
>
> 前提: 已在 mp.weixin.qq.com 登录主体 "马* 宁波"
>
> 范围: 仅含用户操作部分, 我们的回调代码已部署在 h5.aiwill-planner.cn/api/wechat/mp-callback

---

## Step 1 · 服务器配置 (2 分钟)

登录 https://mp.weixin.qq.com → 设置与开发 → 基本配置 → 公众号开发信息 → **服务器配置** → 修改配置

| 字段 | 填什么 | 说明 |
|---|---|---|
| **URL** | `https://h5.aiwill-planner.cn/api/wechat/mp-callback` | 我们的回调端点 |
| **Token** | `9yix0q8pPYgihQOl2oui0vjxsX3OtAZQ` | 来自 Vercel env `WECHAT_MP_TOKEN` |
| **EncodingAESKey** | `n9tgMlniJeRwps5PBS6lpZkPz6dUjtXV3YPbAdgytI` | 来自 Vercel env `WECHAT_MP_AES_KEY` (点"随机生成"可换) |
| **消息加解密方式** | **安全模式** (推荐) | 个人订阅号必须勾"安全模式"; 明文/兼容模式都 OK 但安全模式更稳 |

点 **提交** → 微信会 GET 我们这个 URL → 我们的代码用 Token 验签 → 返回 `echostr` → 微信显示"配置成功"。

**失败排查**:
- "token 验证失败" → 检查 URL 是否能公网访问 (在浏览器打开应返回 `missing params` 字样, 这是 400 正常)
- "请求超时" → Vercel 部署未就绪 / 域名未生效; 试 `curl https://h5.aiwill-planner.cn/api/wechat/mp-callback` 看是否能连通
- "参数错误" → EncodingAESKey 长度必须 43 字符, 不要少/多

---

## Step 2 · 自定义菜单 (3 分钟)

设置与开发 → 自定义菜单 → **创建菜单**

### 选项 A · 直接导入 JSON (推荐, 1 分钟)

点页面右上角 → 看是否有"导入"按钮; 微信公众号后台 (新版) 通常没有 JSON 导入入口, 请用选项 B。

### 选项 B · 手动添加 (3 分钟, 按下表逐个加)

按 `docs/ops/wx-mp-menu.json` 的结构创建:

**一级菜单 1: 开始使用** (4 个子菜单)
| 名称 | 类型 | 填写 |
|---|---|---|
| 在线立遗嘱 | 跳转网页 | URL: `https://h5.aiwill-planner.cn/doc-type` |
| 6 类文书 | 跳转网页 | URL: `https://h5.aiwill-planner.cn/doc-type?tab=all` |
| AI 智能体测 | 跳转网页 | URL: `https://h5.aiwill-planner.cn/questionnaire` |
| 我的订单 | 跳转网页 | URL: `https://h5.aiwill-planner.cn/orders` |

**一级菜单 2: 产品服务** (4 个子菜单)
| 名称 | 类型 | 填写 |
|---|---|---|
| 价格方案 | 跳转网页 | URL: `https://h5.aiwill-planner.cn/doc-type#pricing` |
| 服务流程 | 跳转网页 | URL: `https://h5.aiwill-planner.cn/about` |
| 隐私协议 | 跳转网页 | URL: `https://h5.aiwill-planner.cn/privacy` |
| 备案信息 | 点击推事件 | KEY: `V1001_BEIAN` |

**一级菜单 3: 我的** (4 个子菜单)
| 名称 | 类型 | 填写 |
|---|---|---|
| 个人中心 | 跳转网页 | URL: `https://h5.aiwill-planner.cn/dashboard` |
| 推广赚钱 | 跳转网页 | URL: `https://h5.aiwill-planner.cn/affiliate` |
| 联系客服 | 点击推事件 | KEY: `MENU_CS_CHAT` |
| 绑定帮助 | 点击推事件 | KEY: `MENU_BIND_HELP` |

**保存并发布** → 24h 内粉丝端可见 (个人订阅号硬性规定, 没法绕过)。

> 注意: CLICK 类型菜单触发时, 微信会 POST 到我们的回调 URL, 我们的代码会用 key 匹配后自动回复预设文案 (备案信息 / 客服入口 / 绑定说明)。

---

## Step 3 · 个人认证 (1 分钟, 可选, 推荐)

公众号后台 → 设置与开发 → 公众号设置 → 主体信息 → **视频号快速认证**

- 前提: 已有微信视频号
- 耗时: 1 分钟
- 好处:
  - 解除"未认证"标签, 用户信任度↑
  - 部分高级接口开放 (如获取用户地理位置、获取粉丝来源)
  - 菜单可以加 5 个子菜单 (现在是 4 个刚好)
- 步骤:
  1. 点"视频号快速认证"
  2. 用视频号绑定的微信扫码
  3. 确认授权
  4. 完成

---

## Step 4 · 关注后自动回复 (可选, 2 分钟)

公众号后台 → 内容与互动 → 自动回复 → **关注后回复**

粘贴以下文案:

```
⚖️ 欢迎来到「家有所爱」

专业中国家庭法律文书 · 6 类在线生成

📜 遗嘱 · 婚内协议 · 离婚协议 · 抚养协议 · 夫妻财产 · 赠与协议
💰 全场 ¥19.9 起 · 7 天无理由退款 · 律师持牌审校

👉 开始使用: 戳底部菜单【开始使用】
👉 联系客服: 戳底部【我的】→ 联系客服
👉 查备案: 戳底部【产品服务】→ 备案信息

愿爱有归处, 法有所依。❤️
```

---

## 验收清单

- [ ] Step 1: 服务器配置 → 微信显示"配置成功"
- [ ] Step 2: 菜单已保存并发布 (24h 后粉丝端可见, 但你自己可预览)
- [ ] Step 3: 个人认证完成 (可选)
- [ ] Step 4: 关注自动回复已设置 (可选)
- [ ] **用另一个微信号关注自己的公众号, 测试**:
  - [ ] 自动收到欢迎语
  - [ ] 菜单 3 个一级按钮可见
  - [ ] 点"在线立遗嘱" → 浏览器打开 https://h5.aiwill-planner.cn/doc-type
  - [ ] 点"备案信息" → 自动回复"沪ICP备..."文案
  - [ ] 发"价格" → 自动回复价格列表
  - [ ] 发"人工" → 自动回复客服引导

---

## 故障排查

| 现象 | 原因 | 修复 |
|---|---|---|
| 菜单点了没反应 | CLICK 类型 key 拼写错 | 检查 key 是不是 `V1001_BEIAN` (大写, 下划线) |
| 菜单 24h 后还看不到 | 微信缓存 | 取消关注 → 再关注一次 |
| 网页菜单打不开 | 域名未 ICP 备案被微信拦截 | 我们已 ICP 备案 + 部署在腾讯云; 如仍拦截, 改用短链 (新浪短链生成) |
| 服务器配置 "token 验证失败" | URL 不通 | `curl -I https://h5.aiwill-planner.cn/api/wechat/mp-callback` 应返回 400/200 |
| EncodingAESKey 长度错 | 误删字符 | 重新点"随机生成", 复制完整 43 字符到 Vercel + 微信 |

---

## 上线后 · 立即可发 (从 docs/ops/LAUNCH_PLAYBOOK.md 复制)

**朋友圈首发 (今天)**:
```
免费, 但只限前 1000 名 ⚖️

「家有所爱」上线了
✅ 6 类中国家庭法律文书
✅ AI 3 分钟生成 · 律师持牌审校
✅ 全场 ¥19.9 起

扫码立享新人立减 ¥10 🎁
[h5.aiwill-planner.cn 二维码]
```

**公众号首文 (今天)**:
标题: 「6 类中国家庭法律文书, 3 分钟在线生成」
正文: 见 `docs/ops/LAUNCH_PLAYBOOK.md` §公众号稿
