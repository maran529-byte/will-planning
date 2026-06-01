package tenant

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type TenantManagerConfig struct {
	PoolSize        int
	MaxConnections  int
	MinConnections  int
	ConnMaxLifetime time.Duration
	ConnMaxIdleTime time.Duration
}

type Manager struct {
	pools map[string]*pgxpool.Pool
	cfg   TenantManagerConfig
}

func NewManager(cfg TenantManagerConfig) *Manager {
	return &Manager{
		pools: make(map[string]*pgxpool.Pool),
		cfg:   cfg,
	}
}

func (m *Manager) GetPool(tenantID string) (*pgxpool.Pool, error) {
	if pool, ok := m.pools[tenantID]; ok {
		return pool, nil
	}
	return nil, fmt.Errorf("pool not found for tenant: %s", tenantID)
}

func (m *Manager) Close() {
	for _, pool := range m.pools {
		pool.Close()
	}
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