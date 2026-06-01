package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// QueryExecutor wraps a tenant's pool for query execution.
type QueryExecutor struct {
	pool *pgxpool.Pool
}

// NewQueryExecutor creates a query executor for a tenant pool.
func NewQueryExecutor(pool *pgxpool.Pool) *QueryExecutor {
	return &QueryExecutor{pool: pool}
}

// Query runs a read-only query and returns rows.
func (q *QueryExecutor) Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
	return q.pool.Query(ctx, sql, args)
}

// QueryRow runs a query that returns a single row.
func (q *QueryExecutor) QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row {
	return q.pool.QueryRow(ctx, sql, args)
}

// Exec runs a write query.
func (q *QueryExecutor) Exec(ctx context.Context, sql string, args ...interface{}) (int64, error) {
	tag, err := q.pool.Exec(ctx, sql, args)
	if err != nil {
		return 0, fmt.Errorf("exec failed: %w", err)
	}
	return tag.RowsAffected(), nil
}

// HealthCheck pings the database.
func (q *QueryExecutor) HealthCheck(ctx context.Context) error {
	return q.pool.Ping(ctx)
}
