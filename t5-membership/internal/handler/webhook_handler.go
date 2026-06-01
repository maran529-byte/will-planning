package handler

import (
	"io"
	"net/http"
	"t5-membership/internal/service"

	"github.com/gin-gonic/gin"
)

type WebhookHandler struct {
	paymentSvc service.PaymentService
	orderSvc   service.OrderService
}

func NewWebhookHandler(paymentSvc service.PaymentService, orderSvc service.OrderService) *WebhookHandler {
	return &WebhookHandler{
		paymentSvc: paymentSvc,
		orderSvc:   orderSvc,
	}
}

func (h *WebhookHandler) HandleStripeWebhook(c *gin.Context) {
	payload, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read body"})
		return
	}

	if err := h.paymentSvc.HandleWebhook(payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"received": true})
}

func (h *WebhookHandler) RegisterRoutes(r *gin.Engine) {
	r.POST("/webhook/stripe", h.HandleStripeWebhook)
}