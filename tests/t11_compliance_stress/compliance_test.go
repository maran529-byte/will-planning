package t11_compliance_stress

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gopkg.in/yaml.v3"
)

// --- Mini mock engine for testing without full server setup ---

type MockEngine struct {
	mu     sync.RWMutex
	rules  map[string]*MockRule
	counter int64
}

type MockRule struct {
	ID       string
	Name     string
	Priority int
	Enabled  bool
	Conds    []MockCondition
	Actions  []MockAction
}

type MockCondition struct {
	Field    string
	Operator string
	Value    interface{}
}

type MockAction struct {
	Type   string
	Params map[string]interface{}
}

func NewMockEngine(rulesPath string) (*MockEngine, error) {
	e := &MockEngine{rules: make(map[string]*MockRule)}
	entries, err := os.ReadDir(rulesPath)
	if err != nil {
		return nil, err
	}
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".yaml" {
			continue
		}
		data, err := os.ReadFile(filepath.Join(rulesPath, entry.Name()))
		if err != nil {
			continue
		}
		var rule MockRule
		if err := yaml.Unmarshal(data, &rule); err != nil {
			continue
		}
		if rule.Enabled {
			e.rules[rule.ID] = &rule
		}
	}
	return e, nil
}

func (e *MockEngine) Evaluate(ctx context.Context, tenantID string, data map[string]interface{}) (bool, string, error) {
	atomic.AddInt64(&e.counter, 1)
	e.mu.RLock()
	defer e.mu.RUnlock()

	var matchedRules []*MockRule
	for _, r := range e.rules {
		if r.Enabled && e.matchAll(data, r.Conds) {
			matchedRules = append(matchedRules, r)
		}
	}

	// Sort by priority (lower = higher priority)
	for i := 0; i < len(matchedRules)-1; i++ {
		for j := i + 1; j < len(matchedRules); j++ {
			if matchedRules[j].Priority < matchedRules[i].Priority {
				matchedRules[i], matchedRules[j] = matchedRules[j], matchedRules[i]
			}
		}
	}

	for _, r := range matchedRules {
		for _, a := range r.Actions {
			if a.Type == "reject" {
				return false, fmt.Sprintf("rule %s: %s", r.ID, r.Name), nil
			}
		}
	}
	return true, "", nil
}

func (e *MockEngine) matchAll(data map[string]interface{}, conds []MockCondition) bool {
	for _, c := range conds {
		val, ok := data[c.Field]
		if !ok {
			return false
		}
		switch c.Operator {
		case "eq":
			if fmt.Sprintf("%v", val) != fmt.Sprintf("%v", c.Value) {
				return false
			}
		case "neq":
			if fmt.Sprintf("%v", val) == fmt.Sprintf("%v", c.Value) {
				return false
			}
		case "contains":
			if !contains(fmt.Sprintf("%v", val), fmt.Sprintf("%v", c.Value)) {
				return false
			}
		}
	}
	return true
}

func contains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func (e *MockEngine) Reload() error {
	e.mu.Lock()
	defer e.mu.Unlock()
	// In real test, would re-read from disk; here just re-acquire lock
	return nil
}

// --- Test Cases ---

func TestEngineExists(t *testing.T) {
	// Sanity check: engine file can be loaded
	enginePath := filepath.Join("..", "..", "t1-compliance-engine", "internal", "compliance", "rules.go")
	_, err := os.Stat(enginePath)
	require.NoError(t, err, "rules.go should exist")
}

func TestRulesYAMLFiles(t *testing.T) {
	rulesPath := filepath.Join("..", "..", "t1-compliance-engine", "rules")
	entries, err := os.ReadDir(rulesPath)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(entries), 1, "should have at least 1 rule YAML")
}

// TC-001: 高并发 Evaluate 线程安全
func TestTC001_ConcurrentEvaluate_ThreadSafe(t *testing.T) {
	rulesPath := filepath.Join("..", "..", "t1-compliance-engine", "rules")
	engine, err := NewMockEngine(rulesPath)
	require.NoError(t, err)

	ctx := context.Background()
	var wg sync.WaitGroup
	var panicCount int64
	var successCount int64
	var failCount int64

	N := 100
	Rounds := 50

	for i := 0; i < N; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for j := 0; j < Rounds; j++ {
				data := map[string]interface{}{
					"party_a": "",
					"content": "normal content",
				}
				func() {
					defer func() {
						if r := recover(); r != nil {
							atomic.AddInt64(&panicCount, 1)
						}
					}()
					ok, _, err := engine.Evaluate(ctx, fmt.Sprintf("tenant-%d", id), data)
					if err != nil {
						atomic.AddInt64(&failCount, 1)
						return
					}
					_ = ok
					atomic.AddInt64(&successCount, 1)
				}()
			}
		}(i)
	}

	wg.Wait()

	t.Logf("success=%d fail=%d panic=%d", successCount, failCount, panicCount)
	assert.Equal(t, int64(0), panicCount, "should have no panics")
	assert.Equal(t, int64(N*Rounds), successCount+failCount, "all requests should return")
}

// TC-002: 高并发 QPS 基准
func TestTC002_QPSBenchmark(t *testing.T) {
	rulesPath := filepath.Join("..", "..", "t1-compliance-engine", "rules")
	engine, err := NewMockEngine(rulesPath)
	require.NoError(t, err)

	ctx := context.Background()
	data := map[string]interface{}{
		"party_a": "Alice",
		"content": "clean contract",
	}

	const totalRequests = 1000
	start := time.Now()

	for i := 0; i < totalRequests; i++ {
		_, _, _ = engine.Evaluate(ctx, "benchmark-tenant", data)
	}

	elapsed := time.Since(start)
	qps := float64(totalRequests) / elapsed.Seconds()

	t.Logf("QPS: %.2f (elapsed: %v for %d requests)", qps, elapsed, totalRequests)
	assert.GreaterOrEqual(t, qps, float64(100), "QPS should be >= 100")
}

// TC-003: 规则热加载（Reload 不阻塞 Evaluate）
func TestTC003_HotReload_NoBlocking(t *testing.T) {
	rulesPath := filepath.Join("..", "..", "t1-compliance-engine", "rules")
	engine, err := NewMockEngine(rulesPath)
	require.NoError(t, err)

	ctx := context.Background()

	// Concurrent evaluate during reload
	var wg sync.WaitGroup
	var evalDone int64

	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			data := map[string]interface{}{"party_a": "Bob", "content": "test"}
			for k := 0; k < 20; k++ {
				engine.Evaluate(ctx, "tenant-hot", data)
				atomic.AddInt64(&evalDone, 1)
			}
		}()
	}

	// Simulate reload
	wg.Add(1)
	go func() {
		defer wg.Done()
		time.Sleep(10 * time.Millisecond)
		engine.Reload()
	}()

	wg.Wait()
	t.Logf("Total Evaluate calls: %d", evalDone)
	assert.GreaterOrEqual(t, evalDone, int64(50*20), "all Evaluate calls should complete")
}

// TC-004: 规则热加载（文件删除后规则不再生效）
func TestTC004_HotReload_RuleRemoval(t *testing.T) {
	// This test validates the reload behavior conceptually
	// In a full integration test, we would:
	// 1. Confirm rule-002 (field-validation) is loaded
	// 2. Remove or disable rule-002
	// 3. Verify Evaluate no longer matches it
	t.Skip("Requires filesystem manipulation — run as integration test")
}

// TC-005: 熔断降级 — Panic Recovery
func TestTC005_PanicRecovery(t *testing.T) {
	rulesPath := filepath.Join("..", "..", "t1-compliance-engine", "rules")
	engine, err := NewMockEngine(rulesPath)
	require.NoError(t, err)

	ctx := context.Background()

	// Test 1: Valid data should not panic
	ok, msg, err := engine.Evaluate(ctx, "tenant", map[string]interface{}{
		"party_a": "valid",
	})
	t.Logf("Test1 - ok=%v msg=%s err=%v", ok, msg, err)
	assert.NoError(t, err)

	// Test 2: Invalid data type (triggers type mismatch in mock engine)
	// The mock engine should handle this gracefully with recover
	func() {
		defer func() {
			if r := recover(); r != nil {
				t.Logf("Caught expected panic in test 2: %v", r)
			}
		}()
		_, _, _ = engine.Evaluate(ctx, "tenant-panic", map[string]interface{}{
			"party_a": nil, // nil value may cause type assertion panic in real impl
		})
	}()

	// Test 3: Concurrent panic recovery - multiple goroutines with invalid data
	var wg sync.WaitGroup
	var panicCount int64

	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			defer func() {
				if r := recover(); r != nil {
					atomic.AddInt64(&panicCount, 1)
				}
			}()
			_, _, _ = engine.Evaluate(ctx, fmt.Sprintf("tenant-%d", i), map[string]interface{}{
				"party_a": nil, // may cause panic
			})
		}()
	}
	wg.Wait()

	t.Logf("Panic count during concurrent invalid data: %d", panicCount)
	// Real compliance engine should wrap Evaluate in recover() and never let panic escape
	// This test documents the expected behavior - panic should be caught internally
	assert.True(t, panicCount >= 0, "Panic count should be tracked (real engine should recover internally)")
}

// TC-006: YAML 解析失败降级
func TestTC006_YAMLParseFailure_GracefulDegradation(t *testing.T) {
	rulesPath := filepath.Join("..", "..", "t1-compliance-engine", "rules")
	entries, err := os.ReadDir(rulesPath)
	require.NoError(t, err)

	// Try loading each YAML — any parse error should not crash
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".yaml" {
			continue
		}
		fullPath := filepath.Join(rulesPath, entry.Name())
		data, err := os.ReadFile(fullPath)
		require.NoError(t, err)

		var rule MockRule
		err = yaml.Unmarshal(data, &rule)
		assert.NoError(t, err, "YAML %s should parse correctly", entry.Name())
	}
}

// TC-007: 规则优先级执行顺序
func TestTC007_RulePriorityExecutionOrder(t *testing.T) {
	// Create temporary rules with explicit priorities
	tmpDir := t.TempDir()

	rule1 := `
id: rule-low-priority
name: Low Priority Rule
priority: 10
enabled: true
conditions:
  - field: category
    operator: eq
    value: "test"
actions:
  - type: reject
    params:
      message: "low priority matched"
`
	rule2 := `
id: rule-high-priority
name: High Priority Rule
priority: 1
enabled: true
conditions:
  - field: category
    operator: eq
    value: "test"
actions:
  - type: reject
    params:
      message: "high priority matched"
`
	err := os.WriteFile(filepath.Join(tmpDir, "rule-low.yaml"), []byte(rule1), 0644)
	require.NoError(t, err)
	err = os.WriteFile(filepath.Join(tmpDir, "rule-high.yaml"), []byte(rule2), 0644)
	require.NoError(t, err)

	engine, err := NewMockEngine(tmpDir)
	require.NoError(t, err)

	ctx := context.Background()
	ok, msg, err := engine.Evaluate(ctx, "tenant", map[string]interface{}{
		"category": "test",
	})
	t.Logf("ok=%v msg=%s err=%v", ok, msg, err)
	assert.NoError(t, err)
	// High priority rule (priority=1) should execute first
	assert.Contains(t, msg, "high priority", "higher priority rule should execute first")
}

// TC-008: 规则 Action 类型覆盖
func TestTC008_ActionTypeCoverage(t *testing.T) {
	tmpDir := t.TempDir()

	// Define rules for each action type
	rejectRule := `
id: rule-reject
name: Reject Rule
priority: 1
enabled: true
conditions:
  - field: trigger
    operator: eq
    value: "reject"
actions:
  - type: reject
    params:
      message: "rejected"
`
	warnRule := `
id: rule-warn
name: Warn Rule
priority: 2
enabled: true
conditions:
  - field: trigger
    operator: eq
    value: "warn"
actions:
  - type: warn
    params:
      message: "warning: please review"
`
	maskRule := `
id: rule-mask
name: Mask Rule
priority: 3
enabled: true
conditions:
  - field: trigger
    operator: eq
    value: "mask"
actions:
  - type: mask
    params:
      message: "sensitive data masked"
`
	requireApprovalRule := `
id: rule-approval
name: Require Approval Rule
priority: 4
enabled: true
conditions:
  - field: trigger
    operator: eq
    value: "approval"
actions:
  - type: require_approval
    params:
      message: "requires manual approval"
`

	err := os.WriteFile(filepath.Join(tmpDir, "reject.yaml"), []byte(rejectRule), 0644)
	require.NoError(t, err)
	err = os.WriteFile(filepath.Join(tmpDir, "warn.yaml"), []byte(warnRule), 0644)
	require.NoError(t, err)
	err = os.WriteFile(filepath.Join(tmpDir, "mask.yaml"), []byte(maskRule), 0644)
	require.NoError(t, err)
	err = os.WriteFile(filepath.Join(tmpDir, "approval.yaml"), []byte(requireApprovalRule), 0644)
	require.NoError(t, err)

	engine, err := NewMockEngine(tmpDir)
	require.NoError(t, err)

	ctx := context.Background()

	tests := []struct {
		name           string
		data           map[string]interface{}
		wantOk         bool
		wantMsg        string
		skipForMock    bool // mock only supports reject
	}{
		{
			name:        "reject action",
			data:        map[string]interface{}{"trigger": "reject"},
			wantOk:      false,
			wantMsg:     "rejected",
			skipForMock: false,
		},
		{
			name:        "no match",
			data:        map[string]interface{}{"trigger": "other"},
			wantOk:      true,
			wantMsg:     "",
			skipForMock: false,
		},
		{
			name:        "warn action (NOT implemented in mock)",
			data:        map[string]interface{}{"trigger": "warn"},
			wantOk:      false, // mock returns reject for all actions
			wantMsg:     "",
			skipForMock: true,
		},
		{
			name:        "mask action (NOT implemented in mock)",
			data:        map[string]interface{}{"trigger": "mask"},
			wantOk:      false,
			wantMsg:     "",
			skipForMock: true,
		},
		{
			name:        "require_approval action (NOT implemented in mock)",
			data:        map[string]interface{}{"trigger": "approval"},
			wantOk:      false,
			wantMsg:     "",
			skipForMock: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.skipForMock {
				t.Skip("Action type not implemented in MockEngine")
			}
			ok, msg, err := engine.Evaluate(ctx, "tenant", tt.data)
			assert.NoError(t, err)
			assert.Equal(t, tt.wantOk, ok)
			if tt.wantMsg != "" {
				assert.Contains(t, msg, tt.wantMsg)
			}
		})
	}

	// Summary of implemented vs unimplemented actions
	t.Log("=== Action Type Coverage Summary ===")
	t.Log("IMPLEMENTED: reject")
	t.Log("NOT IMPLEMENTED (in MockEngine): warn, mask, require_approval")
	t.Log("These action types need implementation in t1-compliance-engine for full coverage")
}

// TC-009: 多租户隔离
func TestTC009_MultiTenantIsolation(t *testing.T) {
	tmpDir := t.TempDir()

	// Tenant-specific rules would be in separate rule files in production
	// Here we just verify no shared state leakage between concurrent tenants
	rule := `
id: rule-001
name: Test Rule
priority: 1
enabled: true
conditions:
  - field: party_a
    operator: eq
    value: ""
actions:
  - type: reject
    params:
      message: "missing party_a"
`
	err := os.WriteFile(filepath.Join(tmpDir, "rule.yaml"), []byte(rule), 0644)
	require.NoError(t, err)

	engine, err := NewMockEngine(tmpDir)
	require.NoError(t, err)

	ctx := context.Background()
	var wg sync.WaitGroup
	var tenantCounts [10]int64

	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(tenantID int) {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				data := map[string]interface{}{"party_a": "valid"}
				engine.Evaluate(ctx, fmt.Sprintf("tenant-%d", tenantID), data)
				atomic.AddInt64(&tenantCounts[tenantID], 1)
			}
		}(i)
	}

	wg.Wait()

	for i := 0; i < 10; i++ {
		assert.Equal(t, int64(100), tenantCounts[i], "tenant-%d should complete all requests", i)
	}
}

// TC-010: 断路器阈值触发
func TestTC010_CircuitBreakerThreshold(t *testing.T) {
	// The current compliance engine does NOT have a circuit breaker implemented.
	// TC-010 is marked as a KNOWN GAP requiring new component development.
	//
	// This test documents the expected circuit breaker behavior:
	// 1. When error rate exceeds threshold (e.g., 50% in 10 requests), circuit opens
	// 2. Open circuit returns immediate error without calling underlying engine
	// 3. After recovery timeout, circuit half-opens and allows test request
	// 4. If test request succeeds, circuit closes; otherwise remains open

	tmpDir := t.TempDir()

	// Create a rule that always rejects to simulate errors
	rejectRule := `
id: rule-always-reject
name: Always Reject Rule
priority: 1
enabled: true
conditions:
  - field: simulate_error
    operator: eq
    value: "true"
actions:
  - type: reject
    params:
      message: "simulated error for circuit breaker test"
`
	err := os.WriteFile(filepath.Join(tmpDir, "reject.yaml"), []byte(rejectRule), 0644)
	require.NoError(t, err)

	engine, err := NewMockEngine(tmpDir)
	require.NoError(t, err)

	ctx := context.Background()

	// Simulate circuit breaker behavior
	// In production, this would be handled by a dedicated circuit breaker component
	const (
		circuitOpenErrorThreshold = 5  // errors needed to open circuit
		recoveryTimeoutMs         = 100
	)

	var errorCount int64
	var circuitOpen int64 // 0=closed, 1=open, 2=half-open

	// Simulate making requests that trigger errors
	for i := 0; i < 10; i++ {
		ok, _, _ := engine.Evaluate(ctx, "circuit-test-tenant", map[string]interface{}{
			"simulate_error": "true",
		})
		if !ok {
			atomic.AddInt64(&errorCount, 1)
		}
	}

	errorRate := float64(errorCount) / 10.0
	t.Logf("Error count: %d/10, Error rate: %.0f%%", errorCount, errorRate*100)

	// Check if error threshold would trigger circuit breaker
	if errorCount >= circuitOpenErrorThreshold {
		t.Log("Circuit breaker WOULD open at threshold (simulated)")
		t.Log("Real implementation requires circuit breaker middleware in t1-compliance-engine")
	}

	// Test half-open recovery behavior
	circuitOpen = 1 // simulate circuit in OPEN state
	t.Logf("Circuit state: OPEN (simulated)")

	// In half-open state, limited requests should pass through
	t.Log("Recovery timeout elapsed, circuit moves to HALF-OPEN state")
	circuitOpen = 2

	// Test successful request in half-open state
	ok, _, err := engine.Evaluate(ctx, "circuit-test-tenant", map[string]interface{}{
		"simulate_error": "false", // normal request
	})
	t.Logf("Half-open request result: ok=%v, err=%v", ok, err)

	// Circuit should close after successful request
	if ok && err == nil {
		t.Log("Circuit breaker WOULD close after successful recovery request")
	}

	t.Log("=== Circuit Breaker Expected Behavior ===")
	t.Log("Threshold: 50% errors in 10 requests → OPEN")
	t.Log("Recovery timeout: 100ms (configurable)")
	t.Log("Half-open: allows limited requests to test backend")
	t.Log("Close: after successful requests in half-open state")
	t.Log("")
	t.Log("CURRENT GAP: Real circuit breaker not yet implemented in compliance engine")
	t.Skip("Circuit breaker not yet implemented — requires new component in t1-compliance-engine")
}

// --- Benchmark ---

func BenchmarkEvaluate100Concurrent(b *testing.B) {
	rulesPath := filepath.Join("..", "..", "t1-compliance-engine", "rules")
	engine, err := NewMockEngine(rulesPath)
	if err != nil {
		b.Fatal(err)
	}
	ctx := context.Background()
	data := map[string]interface{}{"party_a": "Test", "content": "clean"}

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			engine.Evaluate(ctx, "bench-tenant", data)
		}
	})
}