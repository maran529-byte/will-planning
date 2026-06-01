package jwt

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// Validator validates JWT tokens and extracts tenant info.
type Validator struct {
	secret   []byte
	issuer   string
	audience string
}

// Claims represents the JWT claims structure.
type Claims struct {
	TenantID string `json:"tenant_id"`
	UserID   string `json:"user_id"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

// NewValidator creates a new JWT validator.
func NewValidator(secret, issuer, audience string) *Validator {
	return &Validator{
		secret:   []byte(secret),
		issuer:   issuer,
		audience: audience,
	}
}

// Validate parses and validates a JWT token.
func (v *Validator) Validate(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return v.secret, nil
	})

	if err != nil {
		return nil, fmt.Errorf("token parse failed: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	if claims.Issuer != v.issuer {
		return nil, fmt.Errorf("invalid issuer")
	}

	if !v.containsAudience(claims.Audience) {
		return nil, fmt.Errorf("invalid audience")
	}

	return claims, nil
}

func (v *Validator) containsAudience(audiences jwt.ClaimStrings) bool {
	for _, aud := range audiences {
		if aud == v.audience {
			return true
		}
	}
	return false
}

// Middleware returns an HTTP middleware for JWT authentication.
func (v *Validator) Middleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"error":"missing authorization header"}`, http.StatusUnauthorized)
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				http.Error(w, `{"error":"invalid authorization format"}`, http.StatusUnauthorized)
				return
			}

			claims, err := v.Validate(parts[1])
			if err != nil {
				http.Error(w, fmt.Sprintf(`{"error":"invalid token","reason":"%s"}`, err.Error()), http.StatusUnauthorized)
				return
			}

			// Inject claims into request context
			ctx := WithClaims(r.Context(), claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetClaims extracts claims from context.
func GetClaims(ctx context.Context) *Claims {
	claims, _ := ctx.Value(ctxKeyClaims{}).(*Claims)
	return claims
}

type ctxKeyClaims struct{}

func WithClaims(ctx context.Context, claims *Claims) context.Context {
	return context.WithValue(ctx, ctxKeyClaims{}, claims)
}
