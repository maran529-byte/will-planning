package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"go.uber.org/zap"

	"aiwill-planner/t2-api-gateway/internal/circuit"
	"aiwill-planner/t2-api-gateway/internal/config"
	"aiwill-planner/t2-api-gateway/internal/gray"
	"aiwill-planner/t2-api-gateway/internal/jwt"
	"aiwill-planner/t2-api-gateway/internal/ratelimit"
)

// ServiceBackend represents a backend service for proxying
type ServiceBackend struct {
	Prefix  string
	Target  string
	Timeout time.Duration
}

func main() {
	zapLogger, err := zap.NewProduction()
	if err != nil {
		log.Fatalf("failed to init logger: %v", err)
	}
	defer zapLogger.Sync()

	cfg, err := config.Load("")
	if err != nil {
		zapLogger.Fatal("failed to load config", zap.Error(err))
	}

	// Initialize components
	jwtValidator := jwt.NewValidator(cfg.JWT.Secret, cfg.JWT.Issuer, cfg.JWT.Audience)
	rateLimitMgr := ratelimit.NewManager(cfg.RateLimit.RequestsPerSec, cfg.RateLimit.BurstSize)
	circuitMgr := circuit.NewManager(cfg.Circuit.Threshold, time.Duration(cfg.Circuit.Timeout)*time.Second)
	grayMgr := gray.NewReleaseManager(cfg.Gray.Percent, cfg.Gray.Enabled)

	// Define service backends
	backends := []ServiceBackend{
		{Prefix: "/api/v1/contracts", Target: cfg.Services.ContractGenerator, Timeout: 30 * time.Second},
		{Prefix: "/api/v1/plans", Target: cfg.Services.Membership, Timeout: 10 * time.Second},
		{Prefix: "/api/v1/membership", Target: cfg.Services.Membership, Timeout: 10 * time.Second},
		{Prefix: "/api/v1/orders", Target: cfg.Services.Membership, Timeout: 10 * time.Second},
		{Prefix: "/api/v1/affiliates", Target: cfg.Services.Affiliate, Timeout: 10 * time.Second},
		{Prefix: "/api/v1/commissions", Target: cfg.Services.Affiliate, Timeout: 10 * time.Second},
		{Prefix: "/api/v1/withdraws", Target: cfg.Services.Affiliate, Timeout: 10 * time.Second},
		{Prefix: "/api/v1/invites", Target: cfg.Services.Affiliate, Timeout: 10 * time.Second},
		{Prefix: "/api/v1/render", Target: cfg.Services.DocumentRenderer, Timeout: 60 * time.Second},
		{Prefix: "/api/v1/miniprogram", Target: cfg.Services.Miniprogram, Timeout: 10 * time.Second},
		{Prefix: "/api/v1/compliance", Target: cfg.Services.ComplianceEngine, Timeout: 10 * time.Second},
	}

	// Build gateway mux
	mux := http.NewServeMux()

	// Health check (no auth)
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Service discovery endpoint
	mux.HandleFunc("/api/v1/services", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		services := map[string]string{
			"contract_generator":  cfg.Services.ContractGenerator,
			"membership":          cfg.Services.Membership,
			"affiliate":           cfg.Services.Affiliate,
			"document_renderer":   cfg.Services.DocumentRenderer,
			"miniprogram":         cfg.Services.Miniprogram,
			"compliance_engine":   cfg.Services.ComplianceEngine,
		}
		fmt.Fprintf(w, `{"services":%v}`, services)
	})

	// Proxy all other requests through the gateway chain
	mux.Handle("/", jwtValidator.Middleware()(rateLimitMgr.Middleware()(circuitMgr.Middleware()(grayMgr.Middleware()(createProxyHandler(backends, zapLogger))))))

	server := &http.Server{
		Addr:         fmt.Sprintf("%s:%d", cfg.Gateway.Host, cfg.Gateway.Port),
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh

		zapLogger.Info("shutting down gateway...")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := server.Shutdown(ctx); err != nil {
			zapLogger.Error("gateway shutdown error", zap.Error(err))
		}
	}()

	zapLogger.Info("starting API gateway",
		zap.String("addr", server.Addr),
		zap.String("upstream", cfg.Gateway.Upstream))

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		zapLogger.Fatal("gateway error", zap.Error(err))
	}
}

// createProxyHandler creates a reverse proxy handler that routes to different backends based on path prefix
func createProxyHandler(backends []ServiceBackend, logger *zap.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// Find matching backend
		for _, backend := range backends {
			if strings.HasPrefix(path, backend.Prefix) {
				targetURL, err := url.Parse(backend.Target)
				if err != nil {
					logger.Error("invalid target URL", zap.String("target", backend.Target), zap.Error(err))
					http.Error(w, "Bad Gateway", http.StatusBadGateway)
					return
				}

				// Create reverse proxy for this backend
				proxy := httputil.ReverseProxy{
					Director: func(req *http.Request) {
						req.URL.Scheme = targetURL.Scheme
						req.URL.Host = targetURL.Host
						req.Host = targetURL.Host
						// Preserve original path for routing
					},
					Transport: &http.Transport{
						ResponseHeaderTimeout: backend.Timeout,
					},
				}

				logger.Debug("proxying request",
					zap.String("path", path),
					zap.String("target", backend.Target))

				proxy.ServeHTTP(w, r)
				return
			}
		}

		// No matching backend found
		http.NotFound(w, r)
	})
}
