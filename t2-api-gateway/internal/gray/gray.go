package gray

import (
	"hash/fnv"
	"sync"
)

// ReleaseManager manages phased/gray releases.
type ReleaseManager struct {
	mu        sync.RWMutex
	versions  map[string]string // tenantID -> version
	grayPerc  int
	enabled   bool
}

// NewReleaseManager creates a gray release manager.
func NewReleaseManager(grayPercent int, enabled bool) *ReleaseManager {
	return &ReleaseManager{
		versions: make(map[string]string),
		grayPerc: grayPercent,
		enabled:  enabled,
	}
}

// RegisterVersion records a tenant's deployed version.
func (m *ReleaseManager) RegisterVersion(tenantID, version string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.versions[tenantID] = version
}

// GetVersion returns the version for a tenant.
func (m *ReleaseManager) GetVersion(tenantID string) string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.versions[tenantID]
}

// IsGray returns true if a tenant should receive gray (new) version.
func (m *ReleaseManager) IsGray(tenantID string) bool {
	if !m.enabled {
		return false
	}

	// Deterministic hash — same tenant always gets same result
	h := fnv.New32a()
	h.Write([]byte(tenantID))
	hash := h.Sum32() % 100

	return int(hash) < m.grayPerc
}

// Middleware adds X-App-Version header based on gray state.
func (m *ReleaseManager) Middleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tenantID := r.Header.Get("X-Tenant-ID")
			if tenantID == "" {
				tenantID = "default"
			}

			version := m.GetVersion(tenantID)
			if version == "" {
				version = "stable"
			}

			if m.IsGray(tenantID) {
				w.Header().Set("X-App-Version", "gray-"+version)
			} else {
				w.Header().Set("X-App-Version", "stable-"+version)
			}

			next.ServeHTTP(w, r)
		})
	}
}
