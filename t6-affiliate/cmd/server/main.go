package main

import (
	"aiwill-planner/t6-affiliate/internal/config"
	"aiwill-planner/t6-affiliate/internal/handler"
	"aiwill-planner/t6-affiliate/internal/middleware"
	"aiwill-planner/t6-affiliate/internal/model"
	"aiwill-planner/t6-affiliate/internal/repository"
	"aiwill-planner/t6-affiliate/internal/service"
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize database
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.DBName,
	)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Auto migrate
	if err := db.AutoMigrate(
		&model.Affiliate{},
		&model.AffiliateInvite{},
		&model.CommissionRecord{},
		&model.WithdrawRequest{},
		&model.CommissionRule{},
	); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// Initialize repositories
	affiliateRepo := repository.NewAffiliateRepository(db)
	commissionRepo := repository.NewCommissionRepository(db)
	withdrawRepo := repository.NewWithdrawRepository(db)
	inviteRepo := repository.NewInviteRepository(db)

	// Initialize services
	level1Rate, _ := strconv.ParseFloat(cfg.App.CommissionRuleLevel1, 64)
	level2Rate, _ := strconv.ParseFloat(cfg.App.CommissionRuleLevel2, 64)
	minAmount, _ := strconv.ParseFloat(cfg.App.WithdrawMinAmount, 64)
	feeRate, _ := strconv.ParseFloat(cfg.App.WithdrawFeeRate, 64)

	affiliateSvc := service.NewAffiliateService(affiliateRepo, inviteRepo)
	commissionSvc := service.NewCommissionService(commissionRepo, affiliateRepo, level1Rate, level2Rate)
	withdrawSvc := service.NewWithdrawService(withdrawRepo, affiliateRepo, minAmount, feeRate)
	inviteSvc := service.NewInviteService(inviteRepo, affiliateRepo)

	// Initialize handlers
	affiliateHandler := handler.NewAffiliateHandler(affiliateSvc)
	commissionHandler := handler.NewCommissionHandler(commissionSvc)
	withdrawHandler := handler.NewWithdrawHandler(withdrawSvc)
	inviteHandler := handler.NewInviteHandler(inviteSvc)

	// Create Fiber app
	app := fiber.New(fiber.Config{
		Mode: cfg.Server.Mode,
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, DELETE, OPTIONS",
	}))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	// Register routes
	affiliateHandler.RegisterRoutes(app)
	commissionHandler.RegisterRoutes(app)
	withdrawHandler.RegisterRoutes(app)
	inviteHandler.RegisterRoutes(app)

	// Middleware for error handling
	app.Use(middleware.ErrorHandler)

	// Graceful shutdown
	go func() {
		if err := app.Listen(":" + cfg.Server.Port); err != nil {
			log.Fatal("Failed to start server:", err)
		}
	}()

	log.Printf("Affiliate service started on port %s", cfg.Server.Port)

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	<-quit

	if err := app.Shutdown(); err != nil {
		log.Fatal("Server shutdown failed:", err)
	}
}