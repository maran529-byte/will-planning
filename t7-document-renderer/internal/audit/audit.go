package audit

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"

	"go.uber.org/zap"
)

type Logger struct {
	file    *os.File
	mu      sync.Mutex
	logger  *zap.Logger
	logPath string
}

type AuditEntry struct {
	Timestamp  string `json:"timestamp"`
	TenantID   string `json:"tenant_id"`
	UserID     string `json:"user_id"`
	Action     string `json:"action"`
	ContractID string `json:"contract_id,omitempty"`
	Details    string `json:"details,omitempty"`
	IP         string `json:"ip,omitempty"`
	UserAgent  string `json:"user_agent,omitempty"`
}

func NewLogger(logPath string, zapLogger *zap.Logger) (*Logger, error) {
	if err := os.MkdirAll(logPath, 0755); err != nil {
		return nil, err
	}
	file, err := os.OpenFile(
		filepath.Join(logPath, "renderer-audit.log"),
		os.O_APPEND|os.O_CREATE|os.O_WRONLY,
		0644,
	)
	if err != nil {
		return nil, err
	}
	return &Logger{
		file:    file,
		logger:  zapLogger,
		logPath: logPath,
	}, nil
}

func (l *Logger) Close() error {
	return l.file.Close()
}

func (l *Logger) LogRender(ctx context.Context, tenantID, userID, contractID, format, ip, userAgent string) {
	entry := AuditEntry{
		Timestamp:  time.Now().Format(time.RFC3339),
		TenantID:   tenantID,
		UserID:     userID,
		Action:     "render",
		ContractID: contractID,
		Details:    "format=" + format,
		IP:         ip,
		UserAgent:  userAgent,
	}
	l.writeEntry(entry)
	l.logger.Info("audit render",
		zap.String("tenant_id", tenantID),
		zap.String("contract_id", contractID),
		zap.String("format", format))
}

func (l *Logger) LogRenderError(ctx context.Context, tenantID, userID, contractID, format, reason, ip, userAgent string) {
	entry := AuditEntry{
		Timestamp:  time.Now().Format(time.RFC3339),
		TenantID:   tenantID,
		UserID:     userID,
		Action:     "render_error",
		ContractID: contractID,
		Details:    "format=" + format + ", reason=" + reason,
		IP:         ip,
		UserAgent:  userAgent,
	}
	l.writeEntry(entry)
	l.logger.Error("audit render error",
		zap.String("tenant_id", tenantID),
		zap.String("contract_id", contractID),
		zap.String("format", format),
		zap.String("reason", reason))
}

func (l *Logger) writeEntry(entry AuditEntry) {
	l.mu.Lock()
	defer l.mu.Unlock()
	data, _ := json.Marshal(entry)
	l.file.Write(data)
	l.file.WriteString("\n")
}

type Service struct {
	logger *Logger
}

func NewService(logger *Logger) *Service {
	return &Service{logger: logger}
}

func (s *Service) LogRender(ctx context.Context, tenantID, userID, contractID, format, ip, userAgent string) {
	s.logger.LogRender(ctx, tenantID, userID, contractID, format, ip, userAgent)
}

func (s *Service) LogRenderError(ctx context.Context, tenantID, userID, contractID, format, reason, ip, userAgent string) {
	s.logger.LogRenderError(ctx, tenantID, userID, contractID, format, reason, ip, userAgent)
}