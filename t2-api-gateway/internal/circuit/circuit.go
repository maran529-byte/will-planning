package circuit

import (
	"errors"
	"net/http"
	"sync"
	"time"
)

// State represents the circuit breaker state.
type State int

const (
	StateClosed State = iota
	StateOpen
	StateHalfOpen
)

func (s State) String() string {
	switch s {
	case StateClosed:
		return "closed"
	case StateOpen:
		return "open"
	case StateHalfOpen:
		return "half-open"
	default:
		return "unknown"
	}
}

// Errors
var ErrTooManyFailures = errors.New("circuit breaker: too many failures")
var ErrCircuitOpen = errors.New("circuit breaker: circuit is open")

// Breaker implements the circuit breaker pattern per tenant.
type Breaker struct {
	mu         sync.Mutex
	state      State
	failures   int
	threshold  int
	timeout    time.Duration
	lastFailure time.Time
}

// NewBreaker creates a new circuit breaker.
func NewBreaker(threshold int, timeout time.Duration) *Breaker {
	return &Breaker{
		state:     StateClosed,
		threshold: threshold,
		timeout:   timeout,
	}
}

// Execute runs a function through the circuit breaker.
func (cb *Breaker) Execute(fn func() error) error {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	switch cb.state {
	case StateOpen:
		if time.Since(cb.lastFailure) > cb.timeout {
			cb.state = StateHalfOpen
		} else {
			return ErrCircuitOpen
		}
	case StateHalfOpen:
		// Allow one test request
	}

	err := fn()
	if err != nil {
		cb.recordFailure()
		return err
	}

	cb.recordSuccess()
	return nil
}

func (cb *Breaker) recordFailure() {
	cb.recordFailureLocked()
}

func (cb *Breaker) recordFailureLocked() {
	cb.failures++
	cb.lastFailure = time.Now()

	if cb.state == StateHalfOpen || cb.failures >= cb.threshold {
		cb.state = StateOpen
	}
}

func (cb *Breaker) recordFailureUnlock() {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	cb.recordFailureLocked()
}

func (cb *Breaker) recordSuccess() {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	cb.recordSuccessLocked()
}

func (cb *Breaker) recordSuccessLocked() {
	cb.failures = 0
	cb.state = StateClosed
}

// State returns the current circuit state.
func (cb *Breaker) GetState() State {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	return cb.state
}

// Manager manages circuit breakers per tenant.
type Manager struct {
	mu        sync.RWMutex
	breakers  map[string]*Breaker
	threshold int
	timeout   time.Duration
}

// NewManager creates a circuit breaker manager.
func NewManager(threshold int, timeout time.Duration) *Manager {
	return &Manager{
		breakers:  make(map[string]*Breaker),
		threshold: threshold,
		timeout:   timeout,
	}
}

// GetBreaker returns the circuit breaker for a tenant.
func (m *Manager) GetBreaker(tenantID string) *Breaker {
	m.mu.RLock()
	cb, ok := m.breakers[tenantID]
	m.mu.RUnlock()

	if ok {
		return cb
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	if cb, ok := m.breakers[tenantID]; ok {
		return cb
	}

	cb = NewBreaker(m.threshold, m.timeout)
	m.breakers[tenantID] = cb
	return cb
}

// Middleware returns an HTTP middleware for circuit breaking.
func (m *Manager) Middleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tenantID := r.Header.Get("X-Tenant-ID")
			if tenantID == "" {
				tenantID = "default"
			}

			cb := m.GetBreaker(tenantID)

			if cb.GetState() == StateOpen {
				http.Error(w, `{"error":"service temporarily unavailable"}`, http.StatusServiceUnavailable)
				return
			}

			// Wrap response writer to detect errors
			wrapped := &statusTracker{ResponseWriter: w, statusCode: http.StatusOK}

			next.ServeHTTP(wrapped, r)

			// Track failures via status code
			if wrapped.statusCode >= 500 {
				cb.recordFailureUnlock()
			}
		})
	}
}

type statusTracker struct {
	http.ResponseWriter
	statusCode int
}

func (st *statusTracker) WriteHeader(code int) {
	st.statusCode = code
	st.ResponseWriter.WriteHeader(code)
}
