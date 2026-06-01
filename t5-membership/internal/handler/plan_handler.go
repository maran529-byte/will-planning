package handler

import (
	"net/http"
	"t5-membership/internal/service"

	"github.com/gin-gonic/gin"
)

type PlanHandler struct {
	planSvc service.PlanService
}

func NewPlanHandler(planSvc service.PlanService) *PlanHandler {
	return &PlanHandler{planSvc: planSvc}
}

func (h *PlanHandler) ListPlans(c *gin.Context) {
	plans, err := h.planSvc.ListPlans()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, plans)
}

func (h *PlanHandler) GetPlan(c *gin.Context) {
	planID := c.Param("id")

	plan, err := h.planSvc.GetPlan(planID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, plan)
}

func (h *PlanHandler) RegisterRoutes(r *gin.RouterGroup) {
	plans := r.Group("/plans")
	{
		plans.GET("", h.ListPlans)
		plans.GET("/:id", h.GetPlan)
	}
}