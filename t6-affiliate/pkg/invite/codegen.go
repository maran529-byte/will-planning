package invite

import (
	"github.com/google/uuid"
)

// InviteCodeGenerator 邀请码生成器
type InviteCodeGenerator struct{}

func NewInviteCodeGenerator() *InviteCodeGenerator {
	return &InviteCodeGenerator{}
}

// Generate 生成邀请码
func (g *InviteCodeGenerator) Generate() string {
	id := uuid.New()
	// 取UUID的前8位并转为大写
	code := id.String()[:8]
	return toUpperCase(code)
}

func toUpperCase(s string) string {
	result := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'a' && c <= 'z' {
			c -= 32
		}
		result[i] = c
	}
	return string(result)
}

// Validate 验证邀请码格式
func (g *InviteCodeGenerator) Validate(code string) bool {
	if len(code) != 8 {
		return false
	}
	for _, c := range code {
		if !((c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9')) {
			return false
		}
	}
	return true
}