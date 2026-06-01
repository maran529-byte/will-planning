package audit

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// EventType represents the type of auditable event.
type EventType string

const (
	EventContractGenerate EventType = "contract.generate"
	EventContractView      EventType = "contract.view"
	EventContractUpdate    EventType = "contract.update"
	EventContractDelete    EventType = "contract.delete"
	EventTenantCreate      EventType = "tenant.create"
	EventTenantUpdate      EventType = "tenant.update"
	EventComplianceReject  EventType = "compliance.reject"
	EventAuthFailure       EventType = "auth.failure"
)

// Entry represents a single audit log entry.
type Entry struct {
	ID        string    `json:"id"`
	TenantID  string    `json:"tenant_id"`
	UserID    string    `json:"user_id"`
	Event     EventType `json:"event"`
	Resource  string    `json:"resource"`
	Details   string    `json:"details"`
	IP        string    `json:"ip"`
	UserAgent string    `json:"user_agent"`
	Result    string    `json:"result"` // success, failure, rejected
	Timestamp time.Time `json:"timestamp"`
}

// Logger handles audit logging with file output per tenant.
type Logger struct {
	mu       sync.Mutex
	basePath string
	logger   *zap.Logger
	buffers  map[string]*os.File // per-tenant log files
}

// NewLogger creates a new audit logger.
func NewLogger(basePath string, zapLogger *zap.Logger) (*Logger, error) {
	if err := os.MkdirAll(basePath, 0700); err != nil {
		return nil, fmt.Errorf("failed to create audit log dir: %w", err)
	}

	return &Logger{
		basePath: basePath,
		logger:   zapLogger,
		buffers:  make(map[string]*os.File),
	}, nil
}

// Log writes an audit entry to the tenant-specific log file.
func (l *Logger) Log(ctx context.Context, entry Entry) error {
	if entry.ID == "" {
		entry.ID = uuid.New().String()
	}
	if entry.Timestamp.IsZero() {
		entry.Timestamp = time.Now().UTC()
	}

	data, err := json.Marshal(entry)
	if err != nil {
		return fmt.Errorf("failed to marshal audit entry: %w", err)
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	file, err := l.getTenantFile(entry.TenantID)
	if err != nil {
		l.logger.Error("failed to get tenant audit file",
			zap.String("tenant_id", entry.TenantID),
			zap.Error(err))
		return err
	}

	line := string(data) + "\n"
	if _, err := file.WriteString(line); err != nil {
		l.logger.Error("failed to write audit entry",
			zap.String("entry_id", entry.ID),
			zap.Error(err))
		return fmt.Errorf("failed to write audit entry: %w", err)
	}

	l.logger.Info("audit",
		zap.String("tenant_id", entry.TenantID),
		zap.String("event", string(entry.Event)),
		zap.String("result", entry.Result))

	return nil
}

// getTenantFile opens (or creates) a log file for a specific tenant.
func (l *Logger) getTenantFile(tenantID string) (*os.File, error) {
	if f, ok := l.buffers[tenantID]; ok {
		return f, nil
	}

	filename := filepath.Join(l.basePath, fmt.Sprintf("audit-%s-%s.log",
		tenantID, time.Now().Format("2006-01-02")))

	file, err := os.OpenFile(filename, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0600)
	if err != nil {
		return nil, fmt.Errorf("failed to open audit file: %w", err)
	}

	l.buffers[tenantID] = file
	return file, nil
}

// Close closes all open log files.
func (l *Logger) Close() {
	l.mu.Lock()
	defer l.mu.Unlock()

	for tenantID, file := range l.buffers {
		file.Close()
		delete(l.buffers, tenantID)
	}
}

// Service provides audit logging as a injectable dependency.
type Service struct {
	logger *Logger
}

// NewService creates an audit service.
func NewService(logger *Logger) *Service {
	return &Service{logger: logger}
}

// Log generation contract event.
func (s *Service) LogContractGenerate(ctx context.Context, tenantID, userID, resource, details, ip, userAgent string) {
	s.logger.Log(ctx, Entry{
		TenantID:  tenantID,
		UserID:    userID,
		Event:     EventContractGenerate,
		Resource:  resource,
		Details:   details,
		IP:        ip,
		UserAgent: userAgent,
		Result:    "success",
	})
}

// LogComplianceReject logs a compliance rejection.
func (s *Service) LogComplianceReject(ctx context.Context, tenantID, userID, resource, details, ip, userAgent string) {
	s.logger.Log(ctx, Entry{
		TenantID:  tenantID,
		UserID:    userID,
		Event:     EventComplianceReject,
		Resource:  resource,
		Details:   details,
		IP:        ip,
		UserAgent: userAgent,
		Result:    "rejected",
	})
}
