package handler

import (
	"aiwill-planner/t6-affiliate/internal/service"
	"github.com/gofiber/fiber/v2"
)

type InviteHandler struct {
	inviteSvc service.InviteService
}

func NewInviteHandler(inviteSvc service.InviteService) *InviteHandler {
	return &InviteHandler{inviteSvc: inviteSvc}
}

func (h *InviteHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/v1/invites")
	api.Post("", h.InviteParent)
	api.Get("/invitee/:inviteeId", h.GetInviteByInviteeID)
	api.Get("/inviter/:inviterId", h.GetInvitesByInviterID)
	api.Get("/inviter/:inviterId/tree", h.GetInviteTree)
	api.Get("/inviter/:inviterId/count", h.CountDownline)
}

type InviteParentRequest struct {
	InviterID  string `json:"inviter_id" validate:"required"`
	InviteeID  string `json:"invitee_id" validate:"required"`
	InviteCode string `json:"invite_code" validate:"required"`
}

func (h *InviteHandler) InviteParent(c *fiber.Ctx) error {
	var req InviteParentRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request"})
	}

	invite, err := h.inviteSvc.InviteParent(req.InviterID, req.InviteeID, req.InviteCode)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(invite)
}

func (h *InviteHandler) GetInviteByInviteeID(c *fiber.Ctx) error {
	inviteeID := c.Params("inviteeId")
	invite, err := h.inviteSvc.GetInviteByInviteeID(inviteeID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "invite not found"})
	}
	return c.JSON(invite)
}

func (h *InviteHandler) GetInvitesByInviterID(c *fiber.Ctx) error {
	inviterID := c.Params("inviterId")
	page := c.QueryInt("page", 1)
	pageSize := c.QueryInt("pageSize", 20)

	invites, total, err := h.inviteSvc.GetInvitesByInviterID(inviterID, page, pageSize)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"data":     invites,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

func (h *InviteHandler) GetInviteTree(c *fiber.Ctx) error {
	inviterID := c.Params("inviterId")
	tree, err := h.inviteSvc.GetInviteTree(inviterID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(tree)
}

func (h *InviteHandler) CountDownline(c *fiber.Ctx) error {
	inviterID := c.Params("inviterId")
	direct, indirect, err := h.inviteSvc.CountDownline(inviterID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"direct_count":   direct,
		"indirect_count": indirect,
	})
}