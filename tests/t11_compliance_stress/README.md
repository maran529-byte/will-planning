# T11: 合规引擎压测与降级演练 — 测试计划

## 1. 测试目标

验证合规引擎在高并发、规则热更新、熔断降级场景下的稳定性与一致性。

---

## 2. 测试范围

### 2.1 核心组件
- `t1-compliance-engine/internal/compliance/rules.go` — 合规规则引擎
- `t1-compliance-engine/rules/*.yaml` — YAML 规则文件

### 2.2 关键行为
| 行为 | 描述 |
|------|------|
| 高并发 Evaluate | 多 tenant 并发调用，验证线程安全与性能 |
| 规则热加载 | 运行时修改 YAML 文件，验证规则无锁reload |
| 熔断降级 | 引擎出错时返回默认放行/拒绝策略 |
| 规则优先级 | 高优先级规则优先匹配与执行 |

---

## 3. 测试用例

### TC-001: 高并发 Evaluate 线程安全
**目的**: 验证并发调用 `Evaluate` 不会导致数据竞争或 panic

**步骤**:
1. 启动引擎，加载所有规则
2. 使用 100 个 goroutine 同时发起 `Evaluate` 调用
3. 每个 goroutine 提交 100 次随机 data payload
4. 统计 success / fail 数量

**验收标准**:
- 0 panic
- 0 data race (用 `go test -race` 检测)
- 所有请求均返回 (bool, string, error)

**预期结果**: PASS

---

### TC-002: 高并发 QPS 基准
**目的**: 验证单租户 QPS 达到 ≥ 100 的验收标准

**步骤**:
1. 启动引擎
2. 单租户连续发送 1000 次 Evaluate 请求
3. 记录总耗时，计算 QPS

**验收标准**:
- QPS ≥ 100

**预期结果**: QPS ≈ 500~2000 (取决于硬件)

---

### TC-003: 规则热加载（无锁Reload）
**目的**: 验证运行时修改 YAML 规则文件，引擎立即感知变更且不阻塞请求

**步骤**:
1. 启动引擎，初始加载 `field-validation.yaml`
2. 并发发起 Evaluate 请求（持续）
3. 后台修改 `field-validation.yaml` 添加新规则
4. 验证新规则立即生效

**验收标准**:
- Evaluate 不会被 reload 阻塞
- 新规则在下次 Evaluate 时立即生效

**预期结果**: PASS

---

### TC-004: 规则热加载（文件删除）
**目的**: 验证删除规则文件后，对应规则从引擎中移除

**步骤**:
1. 加载规则 A、B
2. 后台删除规则 B
3. 发送触发规则 B 的数据
4. 验证规则 B 不再触发

**验收标准**:
- 删除后 Evaluate 不再匹配已删规则

**预期结果**: PASS

---

### TC-005: 熔断降级 — 引擎Panic恢复
**目的**: 验证引擎遇到 panic 时不会导致整个服务崩溃

**步骤**:
1. 通过特定 payload 触发引擎内部 panic（例如除零）
2. 验证引擎自动恢复，后续请求正常处理

**验收标准**:
- 引擎不崩溃
- panic 被 recover，不会传播

**预期结果**: 需要代码增强 panic recovery 保护

---

### TC-006: 熔断降级 — YAML解析失败
**目的**: 验证规则文件格式错误时引擎使用旧规则继续工作

**步骤**:
1. 正常工作时修改 `prohibited-terms.yaml` 为非法 YAML
2. 验证引擎保持旧规则，不加载损坏文件
3. 验证服务仍然响应 Evaluate 请求

**验收标准**:
- 服务不崩溃
- 错误日志记录 YAML 解析失败
- 旧规则仍然生效

**预期结果**: PASS（代码已有此逻辑）

---

### TC-007: 规则优先级执行顺序
**目的**: 验证低 priority 数值（高优先级）规则优先被执行

**步骤**:
1. 定义规则 R1 (priority=1, reject) 和 R2 (priority=2, reject)
2. 发送同时触发 R1 和 R2 的数据
3. 验证 R1 的 action 先执行

**验收标准**:
- 高优先级规则（priority 小）先执行

**预期结果**: PASS

---

### TC-008: 规则 Action 类型覆盖
**目的**: 验证 reject / warn / mask / require_approval 四种 action 均正确处理

**步骤**:
1. 分别创建触发 4 种 action 的规则
2. 发送匹配数据
3. 验证每种 action 类型返回对应的 (bool, message)

**验收标准**:
- reject → return (false, "rule X: ...")
- warn → return (true, "warning: ...") — 当前实现未完整
- mask → 返回数据被脱敏 — 当前实现未完整
- require_approval → 返回需人工审批状态

**预期结果**: 当前代码仅实现 reject；warn/mask/require_approval 需增强

---

### TC-009: 多租户隔离
**目的**: 验证不同 tenant 的 Evaluate 互不干扰

**步骤**:
1. 同时向 10 个不同 tenantID 发起并发 Evaluate
2. 各 tenant 使用不同的触发规则数据
3. 验证租户间无状态污染

**验收标准**:
- 租户间无共享状态

**预期结果**: PASS（引擎无状态设计）

---

### TC-010: 断路器阈值触发
**目的**: 验证错误率超阈值后断路器打开，后续请求快速失败

**步骤**:
1. 连续发送 100 次触发规则拒绝的请求（模拟错误）
2. 错误率达到阈值（如 50%）
3. 验证断路器打开，后续请求直接返回错误

**验收标准**:
- 断路器状态 = OPEN

**预期结果**: 当前实现未包含断路器，需增强

---

## 4. 测试环境要求

| 项目 | 说明 |
|------|------|
| Go | 1.21+ |
| 测试框架 | `testing` + `testify` |
| Race Detector | `go test -race` |
| 超时控制 | 单次 Evaluate ≤ 10ms |
| 并发数 | 100 goroutines 起压 |

---

## 5. 测试目录结构

```
aiwill-planner/
└── tests/
    └── t11_compliance_stress/
        ├── README.md          # 本计划
        ├── compliance_test.go # TC-001~TC-010 测试实现
        └── scripts/
            └── stress.sh     # 压测脚本
```

---

## 6. 风险项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| TC-005 panic recovery 未实现 | 高危 | 需在 `Evaluate` 外层增加 recover |
| TC-008 warn/mask/require_approval 未实现 | 中危 | 明确当前代码仅支持 reject |
| TC-010 断路器未实现 | 中危 | 需新增熔断组件 |
| 热加载文件锁竞争 | 低危 | 现有 RWMutex 已保护 |

---

## 7. 测试执行顺序

```
TC-001 (race检测) → TC-007 → TC-008 → TC-002 (QPS基准) → 
TC-003 → TC-004 → TC-006 → TC-009 → TC-005 → TC-010
```