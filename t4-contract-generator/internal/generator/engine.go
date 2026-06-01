package generator

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"text/template"
	"time"

	"github.com/google/uuid"
)

// ContractTemplate represents a contract document template.
type ContractTemplate struct {
	ID        string                 `json:"id"`
	Name      string                 `json:"name"`
	Version   string                 `json:"version"`
	Category  string                 `json:"category"`
	Fields    []TemplateField        `json:"fields"`
	Content   string                 `json:"content"` // Go template content
	Variables map[string]interface{} `json:"variables"`
}

// TemplateField defines a field in the template.
type TemplateField struct {
	Name       string      `json:"name"`
	Type       string      `json:"type"` // string, number, date, select
	Required   bool        `json:"required"`
	Options    []string    `json:"options,omitempty"`
	Default    interface{} `json:"default,omitempty"`
	Validation *FieldValidation `json:"validation,omitempty"`
}

// FieldValidation defines validation rules for a field.
type FieldValidation struct {
	MinLength    int         `yaml:"min_length,omitempty"`
	MaxLength    int         `yaml:"max_length,omitempty"`
	Min          interface{} `yaml:"min,omitempty"`
	Max          interface{} `yaml:"max,omitempty"`
	Pattern      string      `yaml:"pattern,omitempty"`
	AllowedValues []string  `yaml:"allowed_values,omitempty"`
}

// Contract represents a generated contract document.
type Contract struct {
	ID           string                 `json:"id"`
	TenantID     string                 `json:"tenant_id"`
	UserID       string                 `json:"user_id"`
	TemplateID   string                 `json:"template_id"`
	Title        string                 `json:"title"`
	Data         map[string]interface{} `json:"data"`
	RenderedHTML string                 `json:"rendered_html"`
	Status       ContractStatus         `json:"status"`
	Checksum     string                 `json:"checksum"`
	CreatedAt    time.Time              `json:"created_at"`
	UpdatedAt    time.Time              `json:"updated_at"`
	ExpiresAt    *time.Time             `json:"expires_at,omitempty"`
	Signatures   []Signature            `json:"signatures,omitempty"`
}

// ContractStatus represents the status of a contract.
type ContractStatus string

const (
	StatusDraft     ContractStatus = "draft"
	StatusPending   ContractStatus = "pending"
	StatusActive    ContractStatus = "active"
	StatusSigned    ContractStatus = "signed"
	StatusExpired   ContractStatus = "expired"
	StatusRevoked   ContractStatus = "revoked"
)

// Signature represents a digital signature on a contract.
type Signature struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Role      string    `json:"role"`
	SignedAt  time.Time `json:"signed_at"`
	Checksum  string    `json:"checksum"`
}

// Engine is the AI contract generation engine.
type Engine struct {
	mu          sync.RWMutex
	templates   map[string]*ContractTemplate
	templatesPath string
	logger      interface{ Printf(format string, v ...interface{}) }
}

// NewEngine creates a new contract generation engine.
func NewEngine(templatesPath string, logger interface{ Printf(format string, v ...interface{}) }) (*Engine, error) {
	engine := &Engine{
		templates:    make(map[string]*ContractTemplate),
		templatesPath: templatesPath,
		logger:       logger,
	}

	if err := engine.loadTemplates(); err != nil {
		return nil, err
	}

	return engine, nil
}

// loadTemplates loads all contract templates from the templates directory.
func (e *Engine) loadTemplates() error {
	entries, err := os.ReadDir(e.templatesPath)
	if err != nil {
		return fmt.Errorf("failed to read templates directory: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".json" {
			continue
		}

		templateFile := filepath.Join(e.templatesPath, entry.Name())
		data, err := os.ReadFile(templateFile)
		if err != nil {
			return fmt.Errorf("failed to read template file %s: %w", templateFile, err)
		}

		var tmpl ContractTemplate
		if err := json.Unmarshal(data, &tmpl); err != nil {
			return fmt.Errorf("failed to parse template file %s: %w", templateFile, err)
		}

		e.templates[tmpl.ID] = &tmpl
		e.logger.Printf("loaded template: %s (%s v%s)", tmpl.ID, tmpl.Name, tmpl.Version)
	}

	return nil
}

// GenerateContract generates a contract from a template with given data.
// Returns the generated contract and any error.
func (e *Engine) GenerateContract(ctx context.Context, tenantID, userID, templateID string, data map[string]interface{}) (*Contract, error) {
	e.mu.RLock()
	tmpl, ok := e.templates[templateID]
	e.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("template %s not found", templateID)
	}

	// Validate required fields
	if err := e.validateRequiredFields(tmpl, data); err != nil {
		return nil, fmt.Errorf("field validation failed: %w", err)
	}

	// Render the contract using Go template
	html, err := e.renderContract(tmpl, data)
	if err != nil {
		return nil, fmt.Errorf("failed to render contract: %w", err)
	}

	// Calculate checksum
	checksum := e.calculateChecksum(html)

	contract := &Contract{
		ID:           uuid.New().String(),
		TenantID:     tenantID,
		UserID:       userID,
		TemplateID:   templateID,
		Title:        e.getStringValue(data, "title", tmpl.Name),
		Data:         data,
		RenderedHTML: html,
		Status:       StatusDraft,
		Checksum:     checksum,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}

	return contract, nil
}

// validateRequiredFields checks if all required fields are present and valid.
func (e *Engine) validateRequiredFields(tmpl *ContractTemplate, data map[string]interface{}) error {
	for _, field := range tmpl.Fields {
		if !field.Required {
			continue
		}

		value, exists := data[field.Name]
		if !exists || value == nil || value == "" {
			return fmt.Errorf("required field '%s' is missing", field.Name)
		}

		// Validate field value against validation rules
		if field.Validation != nil {
			if err := e.validateFieldValue(field, value); err != nil {
				return err
			}
		}
	}
	return nil
}

// validateFieldValue validates a field value against its validation rules.
func (e *Engine) validateFieldValue(field TemplateField, value interface{}) error {
	v := fmt.Sprintf("%v", value)
	validation := field.Validation

	if validation.MinLength > 0 && len(v) < validation.MinLength {
		return fmt.Errorf("field '%s' must be at least %d characters", field.Name, validation.MinLength)
	}

	if validation.MaxLength > 0 && len(v) > validation.MaxLength {
		return fmt.Errorf("field '%s' must be at most %d characters", field.Name, validation.MaxLength)
	}

	if len(validation.AllowedValues) > 0 {
		found := false
		for _, allowed := range validation.AllowedValues {
			if v == allowed {
				found = true
				break
			}
		}
		if !found {
			return fmt.Errorf("field '%s' must be one of: %v", field.Name, validation.AllowedValues)
		}
	}

	return nil
}

// renderContract renders a contract using Go template.
func (e *Engine) renderContract(tmpl *ContractTemplate, data map[string]interface{}) (string, error) {
	t, err := template.New(tmpl.ID).Funcs(template.FuncMap{
		"uppercase": func(s string) string {
			return fmt.Sprintf("%s", toUpperCase(s))
		},
		"lowercase": func(s string) string {
			return fmt.Sprintf("%s", toLowerCase(s))
		},
		"formatDate": func(t time.Time, format string) string {
			return t.Format(format)
		},
		"formatCurrency": func(amount float64, currency string) string {
			return fmt.Sprintf("%s %.2f", currency, amount)
		},
	}).Parse(tmpl.Content)

	if err != nil {
		return "", fmt.Errorf("failed to parse template: %w", err)
	}

	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("failed to execute template: %w", err)
	}

	return buf.String(), nil
}

// calculateChecksum calculates SHA256 checksum of the contract content.
func (e *Engine) calculateChecksum(content string) string {
	hash := sha256.Sum256([]byte(content))
	return hex.EncodeToString(hash[:])
}

// getStringValue safely extracts a string value from data map.
func (e *Engine) getStringValue(data map[string]interface{}, key, defaultVal string) string {
	if val, ok := data[key]; ok {
		if s, ok := val.(string); ok && s != "" {
			return s
		}
	}
	return defaultVal
}

// GetTemplate returns a template by ID.
func (e *Engine) GetTemplate(templateID string) (*ContractTemplate, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	tmpl, ok := e.templates[templateID]
	if !ok {
		return nil, fmt.Errorf("template %s not found", templateID)
	}
	return tmpl, nil
}

// ListTemplates returns all available templates.
func (e *Engine) ListTemplates() []*ContractTemplate {
	e.mu.RLock()
	defer e.mu.RUnlock()

	templates := make([]*ContractTemplate, 0, len(e.templates))
	for _, tmpl := range e.templates {
		templates = append(templates, tmpl)
	}
	return templates
}

// Service provides contract generation as an injectable service.
type Service struct {
	engine *Engine
}

// NewService creates a contract generation service.
func NewService(engine *Engine) *Service {
	return &Service{engine: engine}
}

// Generate generates a contract from a template with given data.
func (s *Service) Generate(ctx context.Context, tenantID, userID, templateID string, data map[string]interface{}) (*Contract, error) {
	return s.engine.GenerateContract(ctx, tenantID, userID, templateID, data)
}

// GetTemplate returns a template by ID.
func (s *Service) GetTemplate(templateID string) (*ContractTemplate, error) {
	return s.engine.GetTemplate(templateID)
}

// ListTemplates returns all available templates.
func (s *Service) ListTemplates() []*ContractTemplate {
	return s.engine.ListTemplates()
}

// -----

func toUpperCase(s string) string {
	result := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'a' && c <= 'z' {
			c -= 32
		}
		result[i] = c
	}
	return string(result)
}

func toLowerCase(s string) string {
	result := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			c += 32
		}
		result[i] = c
	}
	return string(result)
}