package handler

import (
	"net/http"
	"strconv"
	"t5-membership/internal/service"

	"github.com/gin-gonic/gin"
)

type MembershipHandler struct {
	membershipSvc service.MembershipService
}

func NewMembershipHandler(membershipSvc service.MembershipService) *MembershipHandler {
	return &MembershipHandler{membershipSvc: membershipSvc}
}

func (h *MembershipHandler) CreateMembership(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req struct {
		PlanID uint `json:"plan_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	membership, err := h.membershipSvc.CreateMembership(userID, req.PlanID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, membership)
}

func (h *MembershipHandler) GetMembership(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	membership, err := h.membershipSvc.GetMembership(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, membership)
}

func (h *MembershipHandler) GetActiveMembership(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	membership, err := h.membershipSvc.GetActiveMembership(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, membership)
}

func (h *MembershipHandler) CancelMembership(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	if err := h.membershipSvc.CancelMembership(userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "membership cancelled"})
}

func (h *MembershipHandler) RenewMembership(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	membership, err := h.membershipSvc.RenewMembership(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, membership)
}

func (h *MembershipHandler) RegisterRoutes(r *gin.RouterGroup) {
	membership := r.Group("/membership")
	{
		membership.POST("", h.CreateMembership)
		membership.GET("", h.GetMembership)
		membership.GET("/active", h.GetActiveMembership)
		membership.DELETE("", h.CancelMembership)
		membership.POST("/renew", h.RenewMembership)
	}
}