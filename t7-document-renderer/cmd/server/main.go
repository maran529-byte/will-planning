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

	"aiwill-planner/t7-document-renderer/internal/audit"
	"aiwill-planner/t7-document-renderer/internal/config"
	"aiwill-planner/t7-document-renderer/internal/handler"
	tenantpkg "aiwill-planner/t7-document-renderer/internal/tenant"
	"aiwill-planner/t7-document-renderer/internal/renderer"
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
	auditService := audit.NewService(auditLogger)

	// Initialize tenant manager
	tenantMgr := tenantpkg.NewManager(tenantpkg.TenantManagerConfig{
		PoolSize:        cfg.Tenant.PoolSize,
		MaxConnections:  20,
		MinConnections:  5,
		ConnMaxLifetime: 30 * time.Minute,
		ConnMaxIdleTime: 5 * time.Minute,
	})
	defer tenantMgr.Close()

	// Initialize renderer engine
	rendererEngine, err := renderer.NewEngine(
		cfg.Renderer.TemplatesPath,
		cfg.Renderer.OutputPath,
		cfg.Renderer.MaxRetries,
		zapLogger,
	)
	if err != nil {
		zapLogger.Fatal("failed to init renderer engine", zap.Error(err))
	}
	rendererService := renderer.NewService(rendererEngine)

	// Initialize HTTP handler
	httpHandler := handler.NewHandler(zapLogger, rendererService, auditService)

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
	mux.HandleFunc("/health", httpHandler.Health)

	// Render endpoints
	mux.HandleFunc("/api/v1/render", httpHandler.Render)
	mux.HandleFunc("/api/v1/render/download", httpHandler.RenderWithTemplate)

	// Graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh

		zapLogger.Info("shutting down document renderer server...")
		cancel()

		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()

		if err := server.Shutdown(shutdownCtx); err != nil {
			zapLogger.Error("server shutdown error", zap.Error(err))
		}
	}()

	zapLogger.Info("starting document renderer server",
		zap.String("addr", server.Addr))

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		zapLogger.Fatal("server error", zap.Error(err))
	}
}