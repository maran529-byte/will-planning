package handler

import (
	"aiwill-planner/t8-miniprogram/internal/middleware"
	"aiwill-planner/t8-miniprogram/internal/model"
	"aiwill-planner/t8-miniprogram/internal/service"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Handler handles HTTP requests.
type Handler struct {
	logger         *zap.Logger
	authService    *service.AuthService
	contractService *service.ContractService
}

// NewHandler creates a new Handler.
func NewHandler(logger *zap.Logger, authService *service.AuthService, contractService *service.ContractService) *Handler {
	return &Handler{
		logger:          logger,
		authService:     authService,
		contractService: contractService,
	}
}

// Health handles health check requests.
func (h *Handler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// LoginRequest handles user login via WeChat code.
func (h *Handler) Login(c *gin.Context) {
	var req service.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	resp, err := h.authService.Login(&req)
	if err != nil {
		h.logger.Error("login failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "login failed"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ListContracts handles listing user contracts.
func (h *Handler) ListContracts(c *gin.Context) {
	userID, _ := c.Get(middleware.UserIDKey)

	contracts, err := h.contractService.ListContracts(userID.(uint))
	if err != nil {
		h.logger.Error("list contracts failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list contracts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"contracts": contracts,
		"count":     len(contracts),
	})
}

// GenerateContract handles contract generation.
func (h *Handler) GenerateContract(c *gin.Context) {
	userID, _ := c.Get(middleware.UserIDKey)

	var req service.ContractRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	resp, err := h.contractService.GenerateContract(userID.(uint), &req)
	if err != nil {
		h.logger.Error("generate contract failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate contract"})
		return
	}

	c.JSON(http.StatusCreated, resp)
}

// GetContract handles getting a specific contract.
func (h *Handler) GetContract(c *gin.Context) {
	userID, _ := c.Get(middleware.UserIDKey)

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid contract id"})
		return
	}

	contract, err := h.contractService.GetContract(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "contract not found"})
		return
	}

	if contract.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "unauthorized"})
		return
	}

	c.JSON(http.StatusOK, contract)
}

// SignContract handles contract signing.
func (h *Handler) SignContract(c *gin.Context) {
	userID, _ := c.Get(middleware.UserIDKey)

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid contract id"})
		return
	}

	var req struct {
		SignData string `json:"sign_data"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	ip := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	err = h.contractService.SignContract(uint(id), userID.(uint), req.SignData, ip, userAgent)
	if err != nil {
		h.logger.Error("sign contract failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "contract signed successfully"})
}

// DownloadContract handles contract download.
func (h *Handler) DownloadContract(c *gin.Context) {
	userID, _ := c.Get(middleware.UserIDKey)

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid contract id"})
		return
	}

	contract, err := h.contractService.GetContract(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "contract not found"})
		return
	}

	if contract.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "unauthorized"})
		return
	}

	// Return contract content as downloadable file
	filename := contract.Title + ".txt"
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Header("Content-Type", "application/octet-stream")
	c.String(http.StatusOK, contract.Content)
}

// GetProfile handles getting user profile.
func (h *Handler) GetProfile(c *gin.Context) {
	user, exists := c.Get(middleware.UserKey)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, user.(*model.User))
}