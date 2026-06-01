package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.uber.org/zap"

	"aiwill-planner/t1-compliance-engine/internal/audit"
	"aiwill-planner/t1-compliance-engine/internal/compliance"
	"aiwill-planner/t1-compliance-engine/internal/config"
	tenantpkg "aiwill-planner/t1-compliance-engine/internal/tenant"
)

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

	// Initialize compliance engine with hot-reload
	complianceEngine, err := compliance.NewEngine(cfg.Compliance.RulesPath, zapLogger)
	if err != nil {
		zapLogger.Fatal("failed to init compliance engine", zap.Error(err))
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if cfg.Compliance.HotReload {
		if err := complianceEngine.EnableHotReload(ctx); err != nil {
			zapLogger.Warn("hot reload not available", zap.Error(err))
		}
	}

	// Initialize tenant manager
	tenantMgr := tenantpkg.NewManager(tenantpkg.TenantManagerConfig{
		PoolSize:        cfg.Tenant.PoolSize,
		MaxConnections:  20,
		MinConnections:  5,
		ConnMaxLifetime: 30 * time.Minute,
		ConnMaxIdleTime: 5 * time.Minute,
	})
	defer tenantMgr.Close()

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

	// Graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh

		zapLogger.Info("shutting down server...")
		cancel()

		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()

		if err := server.Shutdown(shutdownCtx); err != nil {
			zapLogger.Error("server shutdown error", zap.Error(err))
		}
	}()

	zapLogger.Info("starting compliance engine server",
		zap.String("addr", server.Addr))

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		zapLogger.Fatal("server error", zap.Error(err))
	}
}
