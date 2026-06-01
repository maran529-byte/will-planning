package config

import (
	"os"
)

type Config struct {
	ServerPort   string
	DatabaseDSN  string
	JWTSecret    string
	StripeKey    string
	Environment  string
}

func Load() *Config {
	return &Config{
		ServerPort:  getEnv("SERVER_PORT", "8085"),
		DatabaseDSN: getEnv("DATABASE_DSN", "root:password@tcp(localhost:3306)/membership?charset=utf8mb4&parseTime=True&loc=Local"),
		JWTSecret:   getEnv("JWT_SECRET", "your-secret-key"),
		StripeKey:   getEnv("STRIPE_KEY", "sk_test_xxx"),
		Environment: getEnv("ENVIRONMENT", "development"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}