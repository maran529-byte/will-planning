package config

import (
	"os"
	"sync"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Tenant   TenantConfig
	Audit    AuditConfig
	Compliance ComplianceConfig
}

type ServerConfig struct {
	Host string
	Port int
}

type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	SSLMode  string
}

type TenantConfig struct {
	PoolSize int
}

type AuditConfig struct {
	Enabled bool
	Path    string
}

type ComplianceConfig struct {
	RulesPath string
	HotReload bool
}

var (
	cfg  *Config
	once sync.Once
)

func Load(path string) (*Config, error) {
	var err error
	once.Do(func() {
		cfg = &Config{
			Server: ServerConfig{
				Host: getEnv("SERVER_HOST", "0.0.0.0"),
				Port: 8080,
			},
			Database: DatabaseConfig{
				Host:     getEnv("DB_HOST", "localhost"),
				Port:     5432,
				User:     getEnv("DB_USER", "postgres"),
				Password: getEnv("DB_PASSWORD", ""),
				SSLMode:  getEnv("DB_SSLMODE", "disable"),
			},
			Tenant: TenantConfig{
				PoolSize: 10,
			},
			Audit: AuditConfig{
				Enabled: true,
				Path:    getEnv("AUDIT_LOG_PATH", "/var/log/aiwill/audit"),
			},
			Compliance: ComplianceConfig{
				RulesPath: getEnv("COMPLIANCE_RULES_PATH", "./rules"),
				HotReload: true,
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
