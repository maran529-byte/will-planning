package tenant

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Tenant represents a single tenant with isolated resources.
type Tenant struct {
	ID        string
	Name      string
	Pool      *pgxpool.Pool
	DBName    string
	CreatedAt time.Time
}

// Manager manages multi-tenant database pools.
// Each tenant gets a completely isolated PostgreSQL connection pool.
type Manager struct {
	mu      sync.RWMutex
	tenants map[string]*Tenant
	config  TenantManagerConfig
}

// TenantManagerConfig holds configuration for tenant management.
type TenantManagerConfig struct {
	PoolSize        int
	MaxConnections  int32
	MinConnections  int32
	ConnMaxLifetime time.Duration
	ConnMaxIdleTime time.Duration
}

// NewManager creates a new tenant manager.
func NewManager(cfg TenantManagerConfig) *Manager {
	return &Manager{
		tenants: make(map[string]*Tenant),
		config:  cfg,
	}
}

// RegisterTenant creates a new isolated database pool for a tenant.
func (m *Manager) RegisterTenant(ctx context.Context, tenantID, dbName, connString string) (*Tenant, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.tenants[tenantID]; exists {
		return nil, fmt.Errorf("tenant %s already registered", tenantID)
	}

	poolConfig, err := pgxpool.ParseConfig(connString)
	if err != nil {
		return nil, fmt.Errorf("invalid connection string: %w", err)
	}

	poolConfig.MaxConns = m.config.MaxConnections
	poolConfig.MinConns = m.config.MinConnections
	poolConfig.MaxConnLifetime = m.config.ConnMaxLifetime
	poolConfig.MaxConnIdleTime = m.config.ConnMaxIdleTime

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("pool ping failed: %w", err)
	}

	tenant := &Tenant{
		ID:        tenantID,
		Name:      dbName,
		Pool:      pool,
		DBName:    dbName,
		CreatedAt: time.Now(),
	}

	m.tenants[tenantID] = tenant
	return tenant, nil
}

// GetTenant retrieves a tenant by ID. Thread-safe.
func (m *Manager) GetTenant(tenantID string) (*Tenant, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	tenant, ok := m.tenants[tenantID]
	if !ok {
		return nil, fmt.Errorf("tenant %s not found", tenantID)
	}
	return tenant, nil
}

// GetPool returns the isolated connection pool for a tenant.
func (m *Manager) GetPool(tenantID string) (*pgxpool.Pool, error) {
	tenant, err := m.GetTenant(tenantID)
	if err != nil {
		return nil, err
	}
	return tenant.Pool, nil
}

// UnregisterTenant closes and removes a tenant's pool.
func (m *Manager) UnregisterTenant(ctx context.Context, tenantID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	tenant, ok := m.tenants[tenantID]
	if !ok {
		return fmt.Errorf("tenant %s not found", tenantID)
	}

	tenant.Pool.Close()
	delete(m.tenants, tenantID)
	return nil
}

// ListTenants returns all registered tenant IDs.
func (m *Manager) ListTenants() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()

	ids := make([]string, 0, len(m.tenants))
	for id := range m.tenants {
		ids = append(ids, id)
	}
	return ids
}

// Close closes all tenant pools.
func (m *Manager) Close() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, tenant := range m.tenants {
		tenant.Pool.Close()
	}
	m.tenants = make(map[string]*Tenant)
}