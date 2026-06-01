package handler

import (
	"aiwill-planner/t6-affiliate/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type CommissionHandler struct {
	commissionSvc service.CommissionService
}

func NewCommissionHandler(commissionSvc service.CommissionService) *CommissionHandler {
	return &CommissionHandler{commissionSvc: commissionSvc}
}

func (h *CommissionHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/v1/commissions")
	api.Post("/calculate", h.CalculateCommission)
	api.Post("/record", h.RecordCommission)
	api.Post("/settle/:id", h.SettleCommission)
	api.Post("/settle-all", h.SettleAllPending)
	api.Get("/affiliate/:affiliateId", h.GetCommissionRecords)
	api.Get("/affiliate/:affiliateId/stats", h.GetCommissionStats)
}

type CalculateCommissionRequest struct {
	OrderAmount float64 `json:"order_amount"`
	Level       int     `json:"level"`
}

func (h *CommissionHandler) CalculateCommission(c *fiber.Ctx) error {
	var req CalculateCommissionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request"})
	}

	amount := h.commissionSvc.CalculateCommission(req.OrderAmount, req.Level)
	return c.JSON(fiber.Map{
		"order_amount":    req.OrderAmount,
		"commission":      amount,
		"commission_rate": req.Level,
	})
}

type RecordCommissionRequest struct {
	AffiliateID string  `json:"affiliate_id" validate:"required"`
	OrderID     string  `json:"order_id" validate:"required"`
	OrderAmount float64 `json:"order_amount" validate:"required"`
	Level       int     `json:"level" validate:"required"`
}

func (h *CommissionHandler) RecordCommission(c *fiber.Ctx) error {
	var req RecordCommissionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request"})
	}

	affiliateID, err := uuid.Parse(req.AffiliateID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid affiliate_id"})
	}

	record, err := h.commissionSvc.RecordCommission(affiliateID, req.OrderID, req.OrderAmount, req.Level)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(record)
}

func (h *CommissionHandler) SettleCommission(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	if err := h.commissionSvc.SettleCommission(id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "commission settled"})
}

func (h *CommissionHandler) SettleAllPending(c *fiber.Ctx) error {
	count, err := h.commissionSvc.SettleAllPending()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"settled": count})
}

func (h *CommissionHandler) GetCommissionRecords(c *fiber.Ctx) error {
	affiliateID, err := uuid.Parse(c.Params("affiliateId"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid affiliate_id"})
	}

	page := c.QueryInt("page", 1)
	pageSize := c.QueryInt("pageSize", 20)

	records, total, err := h.commissionSvc.GetCommissionRecords(affiliateID, page, pageSize)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"data":     records,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

func (h *CommissionHandler) GetCommissionStats(c *fiber.Ctx) error {
	affiliateID, err := uuid.Parse(c.Params("affiliateId"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid affiliate_id"})
	}

	stats, err := h.commissionSvc.GetCommissionStats(affiliateID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(stats)
}