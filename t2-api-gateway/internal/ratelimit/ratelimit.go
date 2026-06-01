package ratelimit

import (
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
)

// TokenBucket implements per-tenant rate limiting using token bucket.
type TokenBucket struct {
	tokens     float64
	maxTokens  float64
	refillRate float64 // tokens per second
	lastRefill time.Time
	mu         sync.Mutex
}

// NewTokenBucket creates a new token bucket.
func NewTokenBucket(maxTokens, refillRate float64) *TokenBucket {
	return &TokenBucket{
		tokens:     maxTokens,
		maxTokens:  maxTokens,
		refillRate: refillRate,
		lastRefill: time.Now(),
	}
}

// Allow attempts to consume one token.
func (b *TokenBucket) Allow() bool {
	b.mu.Lock()
	defer b.mu.Unlock()

	b.refill()

	if b.tokens >= 1 {
		b.tokens -= 1
		return true
	}
	return false
}

func (b *TokenBucket) refill() {
	now := time.Now()
	elapsed := now.Sub(b.lastRefill).Seconds()
	b.tokens += elapsed * b.refillRate
	if b.tokens > b.maxTokens {
		b.tokens = b.maxTokens
	}
	b.lastRefill = now
}

// Manager manages per-tenant rate limiters.
type Manager struct {
	mu           sync.RWMutex
	limiters     map[string]*TokenBucket
	maxTokens    float64
	refillRate   float64
	requestsPerSec int
}

// NewManager creates a rate limit manager.
func NewManager(requestsPerSec, burstSize int) *Manager {
	return &Manager{
		limiters:     make(map[string]*TokenBucket),
		maxTokens:    float64(burstSize),
		refillRate:   float64(requestsPerSec),
		requestsPerSec: requestsPerSec,
	}
}

// GetLimiter returns the rate limiter for a tenant, creating one if needed.
func (m *Manager) GetLimiter(tenantID string) *TokenBucket {
	m.mu.RLock()
	limiter, ok := m.limiters[tenantID]
	m.mu.RUnlock()

	if ok {
		return limiter
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	// Double-check after acquiring write lock
	if limiter, ok := m.limiters[tenantID]; ok {
		return limiter
	}

	limiter = NewTokenBucket(m.maxTokens, m.refillRate)
	m.limiters[tenantID] = limiter
	return limiter
}

// Middleware returns an HTTP middleware for per-tenant rate limiting.
func (m *Manager) Middleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract tenant ID from context (set by JWT middleware)
			tenantID := r.Header.Get("X-Tenant-ID")
			if tenantID == "" {
				tenantID = "default"
			}

			limiter := m.GetLimiter(tenantID)
			if !limiter.Allow() {
				http.Error(w, `{"error":"rate limit exceeded"}`, http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RecordLimitEvent logs when rate limiting kicks in.
func (m *Manager) RecordLimitEvent(tenantID string) {
	// Could emit metrics here
	_ = tenantID
	_ = uuid.New().String()
}
