package handler

import (
	"net/http"
	"strconv"
	"t5-membership/internal/service"

	"github.com/gin-gonic/gin"
)

type OrderHandler struct {
	orderSvc service.OrderService
}

func NewOrderHandler(orderSvc service.OrderService) *OrderHandler {
	return &OrderHandler{orderSvc: orderSvc}
}

func (h *OrderHandler) CreateOrder(c *gin.Context) {
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

	order, err := h.orderSvc.CreateOrder(userID, req.PlanID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, order)
}

func (h *OrderHandler) GetOrder(c *gin.Context) {
	orderID := c.Param("id")

	order, err := h.orderSvc.GetOrder(orderID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, order)
}

func (h *OrderHandler) GetUserOrders(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	orders, total, err := h.orderSvc.GetUserOrders(userID, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"orders": orders,
		"total":  total,
		"page":   page,
		"size":   pageSize,
	})
}

func (h *OrderHandler) RegisterRoutes(r *gin.RouterGroup) {
	orders := r.Group("/orders")
	{
		orders.POST("", h.CreateOrder)
		orders.GET("", h.GetUserOrders)
		orders.GET("/:id", h.GetOrder)
	}
}