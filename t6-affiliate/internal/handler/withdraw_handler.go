package handler

import (
	"aiwill-planner/t6-affiliate/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type WithdrawHandler struct {
	withdrawSvc service.WithdrawService
}

func NewWithdrawHandler(withdrawSvc service.WithdrawService) *WithdrawHandler {
	return &WithdrawHandler{withdrawSvc: withdrawSvc}
}

func (h *WithdrawHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/v1/withdraws")
	api.Post("", h.ApplyWithdraw)
	api.Put("/:id/process", h.ProcessWithdraw)
	api.Get("/:id", h.GetWithdraw)
	api.Get("/affiliate/:affiliateId", h.GetWithdrawRequests)
	api.Get("/status/:status", h.ListByStatus)
}

type ApplyWithdrawRequest struct {
	AffiliateID string  `json:"affiliate_id" validate:"required"`
	Amount     float64 `json:"amount" validate:"required"`
	BankName   string  `json:"bank_name" validate:"required"`
	BankAccount string `json:"bank_account" validate:"required"`
}

func (h *WithdrawHandler) ApplyWithdraw(c *fiber.Ctx) error {
	var req ApplyWithdrawRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request"})
	}

	affiliateID, err := uuid.Parse(req.AffiliateID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid affiliate_id"})
	}

	withdraw, err := h.withdrawSvc.ApplyWithdraw(affiliateID, req.Amount, req.BankName, req.BankAccount)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(withdraw)
}

type ProcessWithdrawRequest struct {
	Status       string `json:"status" validate:"required"`
	RejectReason string `json:"reject_reason"`
}

func (h *WithdrawHandler) ProcessWithdraw(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	var req ProcessWithdrawRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request"})
	}

	if err := h.withdrawSvc.ProcessWithdraw(id, req.Status, req.RejectReason); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "withdraw processed"})
}

func (h *WithdrawHandler) GetWithdraw(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	withdraw, err := h.withdrawSvc.GetWithdrawByID(id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "withdraw not found"})
	}
	return c.JSON(withdraw)
}

func (h *WithdrawHandler) GetWithdrawRequests(c *fiber.Ctx) error {
	affiliateID, err := uuid.Parse(c.Params("affiliateId"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid affiliate_id"})
	}

	page := c.QueryInt("page", 1)
	pageSize := c.QueryInt("pageSize", 20)

	requests, total, err := h.withdrawSvc.GetWithdrawRequests(affiliateID, page, pageSize)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"data":     requests,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

func (h *WithdrawHandler) ListByStatus(c *fiber.Ctx) error {
	status := c.Params("status")
	page := c.QueryInt("page", 1)
	pageSize := c.QueryInt("pageSize", 20)

	requests, total, err := h.withdrawSvc.ListWithdrawsByStatus(status, page, pageSize)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"data":     requests,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}