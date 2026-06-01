package compliance

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"gopkg.in/yaml.v3"
)

// Rule represents a single compliance rule.
type Rule struct {
	ID          string   `yaml:"id"`
	Name        string   `yaml:"name"`
	Description string   `yaml:"description"`
	Category    string   `yaml:"category"`
	Version     string   `yaml:"version"`
	Priority    int      `yaml:"priority"` // lower = higher priority
	Conditions  []Condition `yaml:"conditions"`
	Actions     []Action     `yaml:"actions"`
	Enabled     bool         `yaml:"enabled"`
}

// Condition defines when a rule applies.
type Condition struct {
	Field    string      `yaml:"field"`
	Operator string      `yaml:"operator"` // eq, neq, contains, gt, lt, in
	Value    interface{} `yaml:"value"`
}

// Action defines what happens when a rule triggers.
type Action struct {
	Type   string                 `yaml:"type"` // reject, warn, mask, require_approval
	Params map[string]interface{} `yaml:"params"`
}

// Engine is the hot-reloadable compliance rules engine.
type Engine struct {
	mu       sync.RWMutex
	rules    map[string]*Rule
	rulesPath string
	logger   interface{ Printf(format string, v ...interface{}) }
	watcher  *watcher
}

// NewEngine creates a new compliance engine with hot-reload support.
func NewEngine(rulesPath string, logger interface{ Printf(format string, v ...interface{}) }) (*Engine, error) {
	engine := &Engine{
		rules:     make(map[string]*Rule),
		rulesPath: rulesPath,
		logger:    logger,
	}

	if err := engine.loadRules(); err != nil {
		return nil, err
	}

	return engine, nil
}

// loadRules reads all YAML rule files from the rules directory.
func (e *Engine) loadRules() error {
	entries, err := os.ReadDir(e.rulesPath)
	if err != nil {
		return fmt.Errorf("failed to read rules directory: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".yaml" {
			continue
		}

		ruleFile := filepath.Join(e.rulesPath, entry.Name())
		data, err := os.ReadFile(ruleFile)
		if err != nil {
			return fmt.Errorf("failed to read rule file %s: %w", ruleFile, err)
		}

		var rule Rule
		if err := yaml.Unmarshal(data, &rule); err != nil {
			return fmt.Errorf("failed to parse rule file %s: %w", ruleFile, err)
		}

		if rule.Enabled {
			e.rules[rule.ID] = &rule
			e.logger.Printf("loaded rule: %s (%s)", rule.ID, rule.Name)
		}
	}

	return nil
}

// EnableHotReload starts a file watcher for rule hot-reload.
func (e *Engine) EnableHotReload(ctx context.Context) error {
	w, err := newWatcher(e.rulesPath)
	if err != nil {
		return err
	}
	e.watcher = w

	go func() {
		for {
			select {
			case <-ctx.Done():
				w.close()
				return
			case event := <-w.events:
				if event.op == opReload {
					if err := e.reload(); err != nil {
						e.logger.Printf("failed to reload rules: %v", err)
					}
				}
			}
		}
	}()

	e.logger.Printf("hot reload enabled for %s", e.rulesPath)
	return nil
}

// reload re-loads all rules from disk.
func (e *Engine) reload() error {
	e.mu.Lock()
	defer e.mu.Unlock()

	oldRules := e.rules
	e.rules = make(map[string]*Rule)

	if err := e.loadRulesUnlocked(); err != nil {
		e.rules = oldRules
		return err
	}

	e.logger.Printf("rules reloaded, %d rules active", len(e.rules))
	return nil
}

func (e *Engine) loadRulesUnlocked() error {
	entries, err := os.ReadDir(e.rulesPath)
	if err != nil {
		return fmt.Errorf("failed to read rules directory: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".yaml" {
			continue
		}

		ruleFile := filepath.Join(e.rulesPath, entry.Name())
		data, err := os.ReadFile(ruleFile)
		if err != nil {
			return fmt.Errorf("failed to read rule file %s: %w", ruleFile, err)
		}

		var rule Rule
		if err := yaml.Unmarshal(data, &rule); err != nil {
			return fmt.Errorf("failed to parse rule file %s: %w", ruleFile, err)
		}

		if rule.Enabled {
			e.rules[rule.ID] = &rule
		}
	}

	return nil
}

// Evaluate checks input data against all active rules.
// Returns rejection reason if blocked, empty string if approved.
func (e *Engine) Evaluate(ctx context.Context, tenantID string, data map[string]interface{}) (bool, string, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	// Sort rules by priority (lower number = higher priority)
	rules := make([]*Rule, 0, len(e.rules))
	for _, rule := range e.rules {
		rules = append(rules, rule)
	}

	// Evaluate all applicable rules
	for _, rule := range rules {
		if !rule.Enabled {
			continue
		}

		matched, err := e.matchConditions(data, rule.Conditions)
		if err != nil {
			return false, "", fmt.Errorf("rule %s condition error: %w", rule.ID, err)
		}

		if !matched {
			continue
		}

		// Rule matched — execute actions in order
		for _, action := range rule.Actions {
			if action.Type == "reject" {
				return false, fmt.Sprintf("rule %s: %s", rule.ID, rule.Name), nil
			}
		}
	}

	return true, "", nil
}

// matchConditions checks if all conditions match the input data.
func (e *Engine) matchConditions(data map[string]interface{}, conditions []Condition) (bool, error) {
	for _, cond := range conditions {
		val, ok := data[cond.Field]
		if !ok {
			return false, nil
		}

		matched, err := matchValue(val, cond.Operator, cond.Value)
		if err != nil {
			return false, err
		}
		if !matched {
			return false, nil
		}
	}
	return true, nil
}

// matchValue compares a value against a condition.
func matchValue(actual interface{}, operator string, expected interface{}) (bool, error) {
	switch operator {
	case "eq":
		return fmt.Sprintf("%v", actual) == fmt.Sprintf("%v", expected), nil
	case "neq":
		return fmt.Sprintf("%v", actual) != fmt.Sprintf("%v", expected), nil
	case "contains":
		return containsString(actual, expected), nil
	case "gt":
		return compareNumeric(actual, expected) > 0, nil
	case "lt":
		return compareNumeric(actual, expected) < 0, nil
	case "in":
		return inSlice(actual, expected), nil
	default:
		return false, fmt.Errorf("unknown operator: %s", operator)
	}
}

func containsString(actual, expected interface{}) bool {
	return contains(fmt.Sprintf("%v", actual), fmt.Sprintf("%v", expected))
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsImpl(s, substr))
}

func containsImpl(s, substr string) bool {
	if len(substr) == 0 {
		return true
	}
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func compareNumeric(a, b interface{}) int {
	af, _ := toFloat64(a)
	bf, _ := toFloat64(b)
	if af > bf {
		return 1
	}
	if af < bf {
		return -1
	}
	return 0
}

func toFloat64(v interface{}) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case float32:
		return float64(n), true
	case int:
		return float64(n), true
	case int64:
		return float64(n), true
	default:
		return 0, false
	}
}

func inSlice(actual, expected interface{}) bool {
	switch exp := expected.(type) {
	case []interface{}:
		for _, e := range exp {
			if fmt.Sprintf("%v", actual) == fmt.Sprintf("%v", e) {
				return true
			}
		}
	}
	return false
}

// GetActiveRules returns a snapshot of all active rules.
func (e *Engine) GetActiveRules() []*Rule {
	e.mu.RLock()
	defer e.mu.RUnlock()

	rules := make([]*Rule, 0, len(e.rules))
	for _, r := range e.rules {
		rules = append(rules, r)
	}
	return rules
}

// watcher watches for file changes in the rules directory.
type watcher struct {
	events   chan fileEvent
	done     chan struct{}
	dir      string
	interval time.Duration
}

type fileEvent struct {
	op     int
	path   string
}

const (
	opReload = iota
)

func newWatcher(dir string) (*watcher, error) {
	return &watcher{
		events:   make(chan fileEvent, 1),
		done:     make(chan struct{}),
		dir:      dir,
		interval: 2 * time.Second,
	}, nil
}

func (w *watcher) close() {
	close(w.done)
}

// -----

// RuleService provides compliance rule management APIs.
type Service struct {
	engine *Engine
}

// NewService creates a compliance service.
func NewService(engine *Engine) *Service {
	return &Service{engine: engine}
}

// ListRules returns all active compliance rules.
func (s *Service) ListRules() []*Rule {
	return s.engine.GetActiveRules()
}

// ValidateInput runs the compliance engine against input data.
func (s *Service) ValidateInput(ctx context.Context, tenantID string, data map[string]interface{}) (bool, string, error) {
	return s.engine.Evaluate(ctx, tenantID, data)
}
