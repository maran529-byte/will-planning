package middleware

import (
	"github.com/gofiber/fiber/v2"
)

func ErrorHandler(c *fiber.Ctx) error {
	err := c.Next()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return nil
}

func RequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		requestID := c.Get("X-Request-ID")
		if requestID == "" {
			requestID = generateUUID()
			c.Set("X-Request-ID", requestID)
		}
		c.Locals("request_id", requestID)
		return c.Next()
	}
}

func generateUUID() string {
	// Simple UUID generation for request ID
	return "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}