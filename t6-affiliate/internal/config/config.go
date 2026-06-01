package config

import (
	"os"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	App      AppConfig
}

type ServerConfig struct {
	Port string
	Mode string // debug, release
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	MaxOpen  int
	MaxIdle  int
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
}

type AppConfig struct {
	WithdrawMinAmount    string
	WithdrawFeeRate      string
	CommissionRuleLevel1 string // 一级佣金比例
	CommissionRuleLevel2 string // 二级佣金比例
}

func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port: getEnv("SERVER_PORT", "8086"),
			Mode: getEnv("GIN_MODE", "debug"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "3306"),
			User:     getEnv("DB_USER", "root"),
			Password: getEnv("DB_PASSWORD", "password"),
			DBName:   getEnv("DB_NAME", "affiliate"),
			MaxOpen:  100,
			MaxIdle:  10,
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       0,
		},
		App: AppConfig{
			WithdrawMinAmount:    getEnv("WITHDRAW_MIN_AMOUNT", "100"),
			WithdrawFeeRate:      getEnv("WITHDRAW_FEE_RATE", "0.01"),
			CommissionRuleLevel1: getEnv("COMMISSION_RATE_L1", "0.10"),
			CommissionRuleLevel2: getEnv("COMMISSION_RATE_L2", "0.05"),
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}