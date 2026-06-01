// Package client provides HTTP client for E2E testing.
package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Config holds E2E test client configuration.
type Config struct {
	BaseURL    string
	TenantID   string
	UserID     string
	HTTPClient *http.Client
}

// NewConfig creates a new test client config.
func NewConfig(baseURL string) *Config {
	return &Config{
		BaseURL: baseURL,
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Client is the E2E test HTTP client.
type Client struct {
	config     *Config
	token      string
	httpClient *http.Client
}

// NewClient creates a new E2E test client.
func NewClient(cfg *Config) *Client {
	return &Client{
		config:     cfg,
		httpClient: cfg.HTTPClient,
	}
}

// SetToken sets the JWT token for authenticated requests.
func (c *Client) SetToken(token string) {
	c.token = token
}

// SetAuth sets tenant and user ID for multi-tenant tests.
func (c *Client) SetAuth(tenantID, userID string) {
	c.config.TenantID = tenantID
	c.config.UserID = userID
}

// doRequest performs an HTTP request with optional auth.
func (c *Client) doRequest(method, path string, body interface{}) (*http.Response, []byte, error) {
	var reqBody io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return nil, nil, fmt.Errorf("marshal body failed: %w", err)
		}
		reqBody = bytes.NewReader(data)
	}

	req, err := http.NewRequest(method, c.config.BaseURL+path, reqBody)
	if err != nil {
		return nil, nil, fmt.Errorf("create request failed: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
	if c.config.TenantID != "" {
		req.Header.Set("X-Tenant-ID", c.config.TenantID)
	}
	if c.config.UserID != "" {
		req.Header.Set("X-User-ID", c.config.UserID)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, nil, fmt.Errorf("do request failed: %w", err)
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, fmt.Errorf("read body failed: %w", err)
	}
	resp.Body.Close()

	return resp, respBody, nil
}

// LoginRequest represents a login request.
type LoginRequest struct {
	Code  string `json:"code"`
	Phone string `json:"phone"`
}

// LoginResponse represents a login response.
type LoginResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Token   string `json:"token,omitempty"`
	Data    *struct {
		UserID    uint   `json:"user_id"`
		Nickname  string `json:"nickname"`
		AvatarURL string `json:"avatar_url"`
	} `json:"data,omitempty"`
}

// Login performs user login.
func (c *Client) Login(req *LoginRequest) (*LoginResponse, error) {
	resp, body, err := c.doRequest(http.MethodPost, "/api/v1/login", req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("login failed: status=%d body=%s", resp.StatusCode, string(body))
	}

	var result LoginResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("unmarshal login response failed: %w", err)
	}

	if result.Token != "" {
		c.SetToken(result.Token)
	}

	return &result, nil
}

// ContractRequest represents a contract generation request.
type ContractRequest struct {
	Title      string                 `json:"title"`
	TemplateID string                 `json:"template_id"`
	Data       map[string]interface{} `json:"data"`
}

// ContractResponse represents a contract generation response.
type ContractResponse struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	ID      uint        `json:"id,omitempty"`
	ContractID uint    `json:"contract_id,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

// GenerateContract generates a new contract.
func (c *Client) GenerateContract(req *ContractRequest) (*ContractResponse, error) {
	resp, body, err := c.doRequest(http.MethodPost, "/api/v1/contracts/generate", req)
	if err != nil {
		return nil, err
	}

	var result ContractResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("unmarshal contract response failed: %w", err)
	}

	return &result, nil
}

// GetContract retrieves a contract by ID.
func (c *Client) GetContract(contractID uint) (*ContractResponse, error) {
	resp, body, err := c.doRequest(http.MethodGet, fmt.Sprintf("/api/v1/contracts/%d", contractID), nil)
	if err != nil {
		return nil, err
	}

	var result ContractResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("unmarshal get contract response failed: %w", err)
	}

	return &result, nil
}

// ListContractsResponse represents a contract list response.
type ListContractsResponse struct {
	Code  int         `json:"code"`
	Count int         `json:"count"`
	Data  interface{} `json:"data,omitempty"`
}

// ListContracts retrieves all contracts for the user.
func (c *Client) ListContracts() (*ListContractsResponse, error) {
	resp, body, err := c.doRequest(http.MethodGet, "/api/v1/contracts", nil)
	if err != nil {
		return nil, err
	}

	var result ListContractsResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("unmarshal list contracts response failed: %w", err)
	}

	return &result, nil
}

// SignRequest represents a contract sign request.
type SignRequest struct {
	SignData string `json:"sign_data"`
}

// SignResponse represents a contract sign response.
type SignResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// SignContract signs a contract.
func (c *Client) SignContract(contractID uint, signData string) (*SignResponse, error) {
	req := &SignRequest{SignData: signData}
	resp, body, err := c.doRequest(http.MethodPost, fmt.Sprintf("/api/v1/contracts/%d/sign", contractID), req)
	if err != nil {
		return nil, err
	}

	var result SignResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("unmarshal sign response failed: %w", err)
	}

	return &result, nil
}

// DownloadResponse represents a contract download response.
type DownloadResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    []byte `json:"data,omitempty"`
}

// DownloadContract downloads a contract.
func (c *Client) DownloadContract(contractID uint) ([]byte, string, error) {
	req, err := http.NewRequest(http.MethodGet, c.config.BaseURL+fmt.Sprintf("/api/v1/contracts/%d/download", contractID), nil)
	if err != nil {
		return nil, "", fmt.Errorf("create download request failed: %w", err)
	}

	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
	if c.config.TenantID != "" {
		req.Header.Set("X-Tenant-ID", c.config.TenantID)
	}
	if c.config.UserID != "" {
		req.Header.Set("X-User-ID", c.config.UserID)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("do download request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", fmt.Errorf("read download body failed: %w", err)
	}

	contentType := resp.Header.Get("Content-Type")
	return body, contentType, nil
}

// ShareResponse represents a share response.
type ShareResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	ShareURL string `json:"share_url,omitempty"`
	ShareID  string `json:"share_id,omitempty"`
}

// GetShareLink retrieves the share link for a contract.
func (c *Client) GetShareLink(contractID uint) (*ShareResponse, error) {
	resp, body, err := c.doRequest(http.MethodGet, fmt.Sprintf("/api/v1/contracts/%d/share", contractID), nil)
	if err != nil {
		return nil, err
	}

	var result ShareResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("unmarshal share response failed: %w", err)
	}

	return &result, nil
}

// ErrorResponse represents an error response.
type ErrorResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Error   string `json:"error,omitempty"`
}

// HealthCheck checks if the service is healthy.
func (c *Client) HealthCheck() error {
	resp, body, err := c.doRequest(http.MethodGet, "/health", nil)
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("health check failed: status=%d body=%s", resp.StatusCode, string(body))
	}
	return nil
}