package config

import (
	"os"
	"sync"
)

type Config struct {
	Gateway  GatewayConfig
	JWT     JWTConfig
	RateLimit RateLimitConfig
	Circuit  CircuitConfig
	Gray     GrayConfig
	Services ServicesConfig
}

type GatewayConfig struct {
	Host string
	Port int
	Upstream string
}

type ServicesConfig struct {
	ContractGenerator  string
	Membership         string
	Affiliate          string
	DocumentRenderer   string
	Miniprogram        string
	ComplianceEngine   string
}

type JWTConfig struct {
	Secret   string
	Issuer   string
	Audience string
}

type RateLimitConfig struct {
	Enabled       bool
	RequestsPerSec int
	BurstSize     int
}

type CircuitConfig struct {
	Enabled  bool
	Threshold int
	Timeout   int // seconds
}

type GrayConfig struct {
	Enabled bool
	Percent  int
}

var (
	cfg  *Config
	once sync.Once
)

func Load(path string) (*Config, error) {
	var err error
	once.Do(func() {
		cfg = &Config{
			Gateway: GatewayConfig{
				Host:     getEnv("GW_HOST", "0.0.0.0"),
				Port:     8080,
				Upstream: getEnv("UPSTREAM_URL", "http://localhost:8081"),
			},
			JWT: JWTConfig{
				Secret:   getEnv("JWT_SECRET", ""),
				Issuer:   getEnv("JWT_ISSUER", "aiwill-planner"),
				Audience: getEnv("JWT_AUDIENCE", "aiwill-api"),
			},
			RateLimit: RateLimitConfig{
				Enabled:        true,
				RequestsPerSec: 100,
				BurstSize:      200,
			},
			Circuit: CircuitConfig{
				Enabled:   true,
				Threshold: 5,
				Timeout:   30,
			},
			Gray: GrayConfig{
				Enabled: true,
				Percent: 10,
			},
			Services: ServicesConfig{
				ContractGenerator:  getEnv("SVC_CONTRACT_GENERATOR", "http://localhost:8081"),
				Membership:         getEnv("SVC_MEMBERSHIP", "http://localhost:8082"),
				Affiliate:          getEnv("SVC_AFFILIATE", "http://localhost:8083"),
				DocumentRenderer:   getEnv("SVC_DOCUMENT_RENDERER", "http://localhost:8084"),
				Miniprogram:        getEnv("SVC_MINIPROGRAM", "http://localhost:8085"),
				ComplianceEngine:   getEnv("SVC_COMPLIANCE_ENGINE", "http://localhost:8086"),
			},
		}
	})
	return cfg, err
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func Get() *Config {
	return cfg
}
