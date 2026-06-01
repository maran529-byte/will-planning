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

	"aiwill-planner/t8-miniprogram/internal/config"
	"aiwill-planner/t8-miniprogram/internal/handler"
	"aiwill-planner/t8-miniprogram/internal/middleware"
	"aiwill-planner/t8-miniprogram/internal/model"
	"aiwill-planner/t8-miniprogram/internal/repository"
	"aiwill-planner/t8-miniprogram/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func main() {
	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		log.Fatalf("failed to init logger: %v", err)
	}
	defer logger.Sync()

	// Load configuration
	cfg := config.Load()

	// Initialize database
	db, err := gorm.Open(sqlite.Open(cfg.DatabaseDSN), &gorm.Config{})
	if err != nil {
		logger.Fatal("failed to connect to database", zap.Error(err))
	}

	// Auto migrate models
	db.AutoMigrate(&model.User{}, &model.Contract{}, &model.SignRecord{})

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	contractRepo := repository.NewContractRepository(db)

	// Initialize services
	authService := service.NewAuthService(userRepo, cfg.JWTSecret)
	contractService := service.NewContractService(contractRepo)

	// Initialize handlers
	httpHandler := handler.NewHandler(logger, authService, contractService)

	// Setup Gin router
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(loggerMiddleware(logger))

	// Health check
	r.GET("/health", httpHandler.Health)

	// Public routes
	r.POST("/api/v1/login", httpHandler.Login)

	// Protected routes
	v1 := r.Group("/api/v1")
	v1.Use(middleware.AuthMiddleware(authService))
	{
		// Profile
		v1.GET("/profile", httpHandler.GetProfile)

		// Contracts
		v1.GET("/contracts", httpHandler.ListContracts)
		v1.POST("/contracts", httpHandler.GenerateContract)
		v1.GET("/contracts/:id", httpHandler.GetContract)
		v1.POST("/contracts/:id/sign", httpHandler.SignContract)
		v1.GET("/contracts/:id/download", httpHandler.DownloadContract)
	}

	// Create HTTP server
	addr := fmt.Sprintf(":%s", cfg.ServerPort)
	server := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh

		logger.Info("shutting down miniprogram server...")

		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()

		if err := server.Shutdown(shutdownCtx); err != nil {
			logger.Error("server shutdown error", zap.Error(err))
		}
	}()

	logger.Info("starting miniprogram server", zap.String("addr", addr))

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Fatal("server error", zap.Error(err))
	}
}

// loggerMiddleware returns a gin middleware for logging.
func loggerMiddleware(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path

		c.Next()

		logger.Info("request",
			zap.String("method", c.Request.Method),
			zap.String("path", path),
			zap.Int("status", c.Writer.Status()),
			zap.Duration("latency", time.Since(start)),
			zap.String("ip", c.ClientIP()),
		)
	}
}