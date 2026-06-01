package main

import (
	"fmt"
	"log"
	"t5-membership/internal/config"
	"t5-membership/internal/handler"
	"t5-membership/internal/middleware"
	"t5-membership/internal/model"
	"t5-membership/internal/repository"
	"t5-membership/internal/service"
	"t5-membership/pkg/payment"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	cfg := config.Load()

	// Initialize logger
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	// Initialize database
	db, err := gorm.Open(mysql.Open(cfg.DatabaseDSN), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	// Auto migrate models
	db.AutoMigrate(&model.SubscriptionPlan{}, &model.Membership{}, &model.Order{}, &model.Payment{})

	// Initialize repositories
	planRepo := repository.NewPlanRepository(db)
	membershipRepo := repository.NewMembershipRepository(db)
	orderRepo := repository.NewOrderRepository(db)

	// Initialize payment client
	stripeClient := payment.NewStripeClient(cfg.StripeKey)

	// Initialize services
	paymentSvc := service.NewPaymentService(stripeClient)
	planSvc := service.NewPlanService(planRepo)
	membershipSvc := service.NewMembershipService(membershipRepo, planRepo, orderRepo)
	orderSvc := service.NewOrderService(orderRepo, planRepo, paymentSvc)

	// Initialize handlers
	planHandler := handler.NewPlanHandler(planSvc)
	membershipHandler := handler.NewMembershipHandler(membershipSvc)
	orderHandler := handler.NewOrderHandler(orderSvc)
	webhookHandler := handler.NewWebhookHandler(paymentSvc, orderSvc)

	// Setup Gin router
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.LoggerMiddleware(logger))

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Register webhook routes (no auth required)
	webhookHandler.RegisterRoutes(r)

	// API v1 routes with auth
	v1 := r.Group("/api/v1")
	v1.Use(middleware.AuthMiddleware(cfg.JWTSecret))
	{
		planHandler.RegisterRoutes(v1)
		membershipHandler.RegisterRoutes(v1)
		orderHandler.RegisterRoutes(v1)
	}

	addr := fmt.Sprintf(":%s", cfg.ServerPort)
	logger.Info("starting server", zap.String("addr", addr))
	if err := r.Run(addr); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}