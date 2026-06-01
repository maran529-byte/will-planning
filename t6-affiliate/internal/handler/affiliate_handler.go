package handler

import (
	"aiwill-planner/t6-affiliate/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type AffiliateHandler struct {
	affiliateSvc service.AffiliateService
}

func NewAffiliateHandler(affiliateSvc service.AffiliateService) *AffiliateHandler {
	return &AffiliateHandler{affiliateSvc: affiliateSvc}
}

func (h *AffiliateHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/v1/affiliates")
	api.Post("", h.CreateAffiliate)
	api.Get("/:id", h.GetAffiliate)
	api.Get("/user/:userId", h.GetAffiliateByUserID)
	api.Put("/:id", h.UpdateAffiliate)
	api.Put("/:id/suspend", h.SuspendAffiliate)
	api.Put("/:id/activate", h.ActivateAffiliate)
	api.Put("/:id/upgrade", h.UpgradeLevel)
	api.Get("", h.ListAffiliates)
	api.Get("/:id/stats", h.GetAffiliateStats)
}

type CreateAffiliateRequest struct {
	UserID string `json:"user_id" validate:"required"`
	Name   string `json:"name" validate:"required"`
	Phone  string `json:"phone"`
	Email  string `json:"email"`
}

func (h *AffiliateHandler) CreateAffiliate(c *fiber.Ctx) error {
	var req CreateAffiliateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request"})
	}

	affiliate, err := h.affiliateSvc.CreateAffiliate(req.UserID, req.Name, req.Phone, req.Email)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(affiliate)
}

func (h *AffiliateHandler) GetAffiliate(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	affiliate, err := h.affiliateSvc.GetAffiliate(id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "affiliate not found"})
	}
	return c.JSON(affiliate)
}

func (h *AffiliateHandler) GetAffiliateByUserID(c *fiber.Ctx) error {
	userID := c.Params("userId")
	affiliate, err := h.affiliateSvc.GetAffiliateByUserID(userID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "affiliate not found"})
	}
	return c.JSON(affiliate)
}

type UpdateAffiliateRequest struct {
	Name  string `json:"name"`
	Phone string `json:"phone"`
	Email string `json:"email"`
}

func (h *AffiliateHandler) UpdateAffiliate(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	var req UpdateAffiliateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request"})
	}

	affiliate, err := h.affiliateSvc.GetAffiliate(id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "affiliate not found"})
	}

	affiliate.Name = req.Name
	affiliate.Phone = req.Phone
	affiliate.Email = req.Email

	if err := h.affiliateSvc.UpdateAffiliate(affiliate); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(affiliate)
}

func (h *AffiliateHandler) SuspendAffiliate(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	if err := h.affiliateSvc.SuspendAffiliate(id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "affiliate suspended"})
}

func (h *AffiliateHandler) ActivateAffiliate(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	if err := h.affiliateSvc.ActivateAffiliate(id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "affiliate activated"})
}

type UpgradeLevelRequest struct {
	Level int `json:"level"`
}

func (h *AffiliateHandler) UpgradeLevel(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	var req UpgradeLevelRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request"})
	}

	if err := h.affiliateSvc.UpgradeLevel(id, req.Level); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "level upgraded"})
}

func (h *AffiliateHandler) ListAffiliates(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	pageSize := c.QueryInt("pageSize", 20)

	affiliates, total, err := h.affiliateSvc.ListAffiliates(page, pageSize)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"data":  affiliates,
		"total": total,
		"page":  page,
		"pageSize": pageSize,
	})
}

func (h *AffiliateHandler) GetAffiliateStats(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	stats, err := h.affiliateSvc.GetAffiliateStats(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(stats)
}