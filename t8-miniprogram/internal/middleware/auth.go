package middleware

import (
	"aiwill-planner/t8-miniprogram/internal/service"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const (
	// UserIDKey is the context key for user ID.
	UserIDKey = "user_id"
	// UserKey is the context key for user.
	UserKey = "user"
)

// AuthMiddleware creates JWT authentication middleware.
func AuthMiddleware(authService *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization header required"})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization format"})
			c.Abort()
			return
		}

		token := parts[1]
		user, err := authService.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}

		c.Set(UserIDKey, user.ID)
		c.Set(UserKey, user)
		c.Next()
	}
}