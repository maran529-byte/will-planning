package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.uber.org/zap"

	"aiwill-planner/t4-contract-generator/internal/audit"
	"aiwill-planner/t4-contract-generator/internal/compliance"
	"aiwill-planner/t4-contract-generator/internal/config"
	"aiwill-planner/t4-contract-generator/internal/generator"
	tenantpkg "aiwill-planner/t4-contract-generator/internal/tenant"
)

// GenerateRequest represents a contract generation request.
type GenerateRequest struct {
	TemplateID string                 `json:"template_id"`
	Title      string                 `json:"title"`
	Data       map[string]interface{} `json:"data"`
}

// GenerateResponse represents a contract generation response.
type GenerateResponse struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	Status     string `json:"status"`
	Checksum   string `json:"checksum"`
	CreatedAt  string `json:"created_at"`
	RenderedHTML string `json:"rendered_html,omitempty"`
}

// ErrorResponse represents an error response.
type ErrorResponse struct {
	Error   string `json:"error"`
	Code    string `json:"code,omitempty"`
	Details string `json:"details,omitempty"`
}

func main() {
	// Initialize zap logger
	zapLogger, err := zap.NewProduction()
	if err != nil {
		log.Fatalf("failed to init logger: %v", err)
	}
	defer zapLogger.Sync()

	// Load configuration
	cfg, err := config.Load("")
	if err != nil {
		zapLogger.Fatal("failed to load config", zap.Error(err))
	}

	// Initialize audit logger
	auditLogger, err := audit.NewLogger(cfg.Audit.Path, zapLogger)
	if err != nil {
		zapLogger.Fatal("failed to init audit logger", zap.Error(err))
	}
	defer auditLogger.Close()
	auditService := audit.NewService(auditLogger)

	// Initialize compliance engine with hot-reload
	complianceEngine, err := compliance.NewEngine(cfg.Compliance.RulesPath, zapLogger)
	if err != nil {
		zapLogger.Fatal("failed to init compliance engine", zap.Error(err))
	}
	complianceService := compliance.NewService(complianceEngine)

	// Initialize contract generator engine
	generatorEngine, err := generator.NewEngine(cfg.Generator.TemplatesPath, zapLogger)
	if err != nil {
		zapLogger.Fatal("failed to init generator engine", zap.Error(err))
	}
	generatorService := generator.NewService(generatorEngine)

	// Initialize tenant manager
	tenantMgr := tenantpkg.NewManager(tenantpkg.TenantManagerConfig{
		PoolSize:        cfg.Tenant.PoolSize,
		MaxConnections:  20,
		MinConnections:  5,
		ConnMaxLifetime: 30 * time.Minute,
		ConnMaxIdleTime: 5 * time.Minute,
	})
	defer tenantMgr.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Enable hot-reload for compliance rules
	if cfg.Compliance.HotReload {
		if err := complianceEngine.EnableHotReload(ctx); err != nil {
			zapLogger.Warn("hot reload not available", zap.Error(err))
		}
	}

	// Create HTTP server
	mux := http.NewServeMux()
	server := &http.Server{
		Addr:         fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port),
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Health endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Contract generation endpoint
	mux.HandleFunc("/api/v1/contracts/generate", handleGenerate(zapLogger, generatorService, complianceService, auditService))

	// List templates endpoint
	mux.HandleFunc("/api/v1/templates", handleListTemplates(zapLogger, generatorService))

	// Get template endpoint
	mux.HandleFunc("/api/v1/templates/", handleGetTemplate(zapLogger, generatorService))

	// List compliance rules endpoint
	mux.HandleFunc("/api/v1/compliance/rules", handleListRules(zapLogger, complianceService))

	// Graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh

		zapLogger.Info("shutting down contract generator server...")
		cancel()

		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()

		if err := server.Shutdown(shutdownCtx); err != nil {
			zapLogger.Error("server shutdown error", zap.Error(err))
		}
	}()

	zapLogger.Info("starting contract generator server",
		zap.String("addr", server.Addr))

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		zapLogger.Fatal("server error", zap.Error(err))
	}
}

// handleGenerate handles contract generation requests.
func handleGenerate(logger *zap.Logger, genSvc *generator.Service, compSvc *compliance.Service, auditSvc *audit.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeError(w, "method not allowed", "METHOD_NOT_ALLOWED", http.StatusMethodNotAllowed)
			return
		}

		tenantID := r.Header.Get("X-Tenant-ID")
		userID := r.Header.Get("X-User-ID")
		ip := r.RemoteAddr
		userAgent := r.UserAgent()

		if tenantID == "" {
			tenantID = "default"
		}
		if userID == "" {
			userID = "anonymous"
		}

		var req GenerateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, "invalid request body", "INVALID_REQUEST", http.StatusBadRequest)
			return
		}

		// Run compliance check before generation
		complianceData := map[string]interface{}{
			"template_id": req.TemplateID,
			"title":       req.Title,
		}
		for k, v := range req.Data {
			complianceData[k] = v
		}

		passed, reason, err := compSvc.ValidateInput(r.Context(), tenantID, complianceData)
		if err != nil {
			logger.Error("compliance check failed", zap.Error(err))
			writeError(w, "compliance check failed", "COMPLIANCE_ERROR", http.StatusInternalServerError)
			return
		}

		if !passed {
			logger.Info("compliance rejected",
				zap.String("tenant_id", tenantID),
				zap.String("reason", reason))
			auditSvc.LogComplianceReject(r.Context(), tenantID, userID, req.TemplateID, reason, ip, userAgent)
			writeError(w, reason, "COMPLIANCE_REJECTED", http.StatusForbidden)
			return
		}

		// Generate the contract
		contract, err := genSvc.Generate(r.Context(), tenantID, userID, req.TemplateID, req.Data)
		if err != nil {
			logger.Error("contract generation failed", zap.Error(err))
			writeError(w, err.Error(), "GENERATION_FAILED", http.StatusInternalServerError)
			return
		}

		// Log successful generation
		auditSvc.LogContractGenerate(r.Context(), tenantID, userID, contract.ID, fmt.Sprintf("generated from template %s", req.TemplateID), ip, userAgent)

		logger.Info("contract generated",
			zap.String("contract_id", contract.ID),
			zap.String("tenant_id", tenantID),
			zap.String("template_id", req.TemplateID))

		resp := GenerateResponse{
			ID:          contract.ID,
			Title:       contract.Title,
			Status:      string(contract.Status),
			Checksum:    contract.Checksum,
			CreatedAt:   contract.CreatedAt.Format(time.RFC3339),
			RenderedHTML: contract.RenderedHTML,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}
}

// handleListTemplates handles listing available templates.
func handleListTemplates(logger *zap.Logger, genSvc *generator.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		templates := genSvc.ListTemplates()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"templates": templates,
			"count":     len(templates),
		})
	}
}

// handleGetTemplate handles getting a specific template.
func handleGetTemplate(logger *zap.Logger, genSvc *generator.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		templateID := r.URL.Path[len("/api/v1/templates/"):]
		tmpl, err := genSvc.GetTemplate(templateID)
		if err != nil {
			writeError(w, "template not found", "NOT_FOUND", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(tmpl)
	}
}

// handleListRules handles listing compliance rules.
func handleListRules(logger *zap.Logger, compSvc *compliance.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rules := compSvc.ListRules()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"rules": rules,
			"count": len(rules),
		})
	}
}

// writeError writes an error response.
func writeError(w http.ResponseWriter, message, code string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ErrorResponse{
		Error: message,
		Code:  code,
	})
}