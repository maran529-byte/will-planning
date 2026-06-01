package config

import (
	"os"
)

// Config holds the application configuration.
type Config struct {
	ServerPort  string
	DatabaseDSN string
	JWTSecret   string
	Environment string
}

// Load loads configuration from environment variables.
func Load() *Config {
	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}

	dbPath := os.Getenv("DATABASE_PATH")
	if dbPath == "" {
		dbPath = "./miniprogram.db"
	}

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		// SECURITY: In production, JWT_SECRET MUST be set via environment variable.
		// Using a default secret in production is a security vulnerability.
		secret = "miniprogram-secret-key-change-in-production"
	}

	env := os.Getenv("ENVIRONMENT")
	if env == "" {
		env = "development"
	}

	// Validate JWT secret length for security
	if env == "production" && len(secret) < 32 {
		panic("JWT_SECRET must be at least 32 characters in production")
	}

	return &Config{
		ServerPort:  port,
		DatabaseDSN: dbPath,
		JWTSecret:   secret,
		Environment: env,
	}
}