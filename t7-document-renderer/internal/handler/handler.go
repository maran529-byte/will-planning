package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"go.uber.org/zap"

	"aiwill-planner/t7-document-renderer/internal/audit"
	"aiwill-planner/t7-document-renderer/internal/renderer"
	tenantpkg "aiwill-planner/t7-document-renderer/internal/tenant"
)

type RenderRequest struct {
	ContractID string                 `json:"contract_id"`
	Title      string                 `json:"title"`
	Content    string                 `json:"content"`
	Data       map[string]interface{} `json:"data"`
	Format     string                 `json:"format"`
}

type RenderResponse struct {
	FileData []byte `json:"file_data"`
	MIMEType string `json:"mime_type"`
	Size     int    `json:"size"`
}

type ErrorResponse struct {
	Error string `json:"error"`
	Code  string `json:"code,omitempty"`
}

func NewHandler(logger *zap.Logger, rendererSvc *renderer.Service, auditSvc *audit.Service) *Handler {
	return &Handler{
		logger:      logger,
		rendererSvc: rendererSvc,
		auditSvc:    auditSvc,
	}
}

type Handler struct {
	logger      *zap.Logger
	rendererSvc *renderer.Service
	auditSvc    *audit.Service
}

func (h *Handler) Render(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, "method not allowed", "METHOD_NOT_ALLOWED", http.StatusMethodNotAllowed)
		return
	}

	tenantID := r.Header.Get("X-Tenant-ID")
	userID := r.Header.Get("X-User-ID")
	ip := r.RemoteAddr
	userAgent := r.UserAgent()

	if tenantID == "" {
		tenantID = "default"
	}
	if userID == "" {
		userID = "anonymous"
	}

	var req RenderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, "invalid request body", "INVALID_REQUEST", http.StatusBadRequest)
		return
	}

	if req.Format != "docx" && req.Format != "pdf" {
		writeError(w, "format must be 'docx' or 'pdf'", "INVALID_FORMAT", http.StatusBadRequest)
		return
	}

	ctx := tenantpkg.WithTenant(r.Context(), tenantID, userID)

	renderReq := renderer.RenderRequest{
		ContractID: req.ContractID,
		Title:      req.Title,
		Content:    req.Content,
		Data:       req.Data,
		Format:     req.Format,
	}

	resp, err := h.rendererSvc.Render(ctx, tenantID, userID, renderReq)
	if err != nil {
		h.logger.Error("render failed", zap.Error(err))
		h.auditSvc.LogRenderError(ctx, tenantID, userID, req.ContractID, req.Format, err.Error(), ip, userAgent)
		writeError(w, err.Error(), "RENDER_FAILED", http.StatusInternalServerError)
		return
	}

	h.auditSvc.LogRender(ctx, tenantID, userID, req.ContractID, req.Format, ip, userAgent)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(RenderResponse{
		FileData: resp.FileData,
		MIMEType: resp.MIMEType,
		Size:     resp.Size,
	})
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}

func (h *Handler) RenderWithTemplate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, "method not allowed", "METHOD_NOT_ALLOWED", http.StatusMethodNotAllowed)
		return
	}

	tenantID := r.Header.Get("X-Tenant-ID")
	userID := r.Header.Get("X-User-ID")
	ip := r.RemoteAddr
	userAgent := r.UserAgent()

	if tenantID == "" {
		tenantID = "default"
	}
	if userID == "" {
		userID = "anonymous"
	}

	var req RenderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, "invalid request body", "INVALID_REQUEST", http.StatusBadRequest)
		return
	}

	if req.Format != "docx" && req.Format != "pdf" {
		writeError(w, "format must be 'docx' or 'pdf'", "INVALID_FORMAT", http.StatusBadRequest)
		return
	}

	ctx := tenantpkg.WithTenant(r.Context(), tenantID, userID)

	renderReq := renderer.RenderRequest{
		ContractID: req.ContractID,
		Title:      req.Title,
		Content:    req.Content,
		Data:       req.Data,
		Format:     req.Format,
	}

	resp, err := h.rendererSvc.Render(ctx, tenantID, userID, renderReq)
	if err != nil {
		h.logger.Error("render with template failed", zap.Error(err))
		h.auditSvc.LogRenderError(ctx, tenantID, userID, req.ContractID, req.Format, err.Error(), ip, userAgent)
		writeError(w, err.Error(), "RENDER_FAILED", http.StatusInternalServerError)
		return
	}

	h.auditSvc.LogRender(ctx, tenantID, userID, req.ContractID, req.Format, ip, userAgent)

	w.Header().Set("Content-Type", resp.MIMEType)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.%s\"", req.Title, req.Format))
	w.Write(resp.FileData)
}

func writeError(w http.ResponseWriter, message, code string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ErrorResponse{
		Error: message,
		Code:  code,
	})
}

type contextKey string

const TenantIDKey contextKey = "tenant_id"
const UserIDKey contextKey = "user_id"

func WithTenant(ctx context.Context, tenantID, userID string) context.Context {
	ctx = context.WithValue(ctx, TenantIDKey, tenantID)
	ctx = context.WithValue(ctx, UserIDKey, userID)
	return ctx
}

func GetTenantID(ctx context.Context) string {
	if v := ctx.Value(TenantIDKey); v != nil {
		return v.(string)
	}
	return ""
}

func GetUserID(ctx context.Context) string {
	if v := ctx.Value(UserIDKey); v != nil {
		return v.(string)
	}
	return ""
}

func formatTime(t time.Time) string {
	return t.Format(time.RFC3339)
}