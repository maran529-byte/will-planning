package service

import (
	"aiwill-planner/t8-miniprogram/internal/model"
	"aiwill-planner/t8-miniprogram/internal/repository"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// AuthService handles authentication.
type AuthService struct {
	userRepo  *repository.UserRepository
	jwtSecret string
}

// NewAuthService creates a new AuthService.
func NewAuthService(userRepo *repository.UserRepository, jwtSecret string) *AuthService {
	return &AuthService{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
	}
}

// LoginRequest represents a login request.
type LoginRequest struct {
	Code     string `json:"code"`
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar"`
}

// LoginResponse represents a login response.
type LoginResponse struct {
	Token    string       `json:"token"`
	User     *model.User  `json:"user"`
	NeedsREG bool         `json:"needs_reg"`
}

// GenerateToken generates a JWT token for a user.
func (s *AuthService) GenerateToken(user *model.User) (string, error) {
	claims := jwt.MapClaims{
		"user_id": user.ID,
		"open_id": user.OpenID,
		"exp":     time.Now().Add(7 * 24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

// Login handles user login via WeChat code.
func (s *AuthService) Login(req *LoginRequest) (*LoginResponse, error) {
	// In production, this would call WeChat API to get openid
	// For now, we simulate with the code as openid
	openid := "wx_" + req.Code

	user, err := s.userRepo.FindByOpenID(openid)
	if err != nil {
		// User doesn't exist, create a new one
		user = &model.User{
			OpenID:    openid,
			Nickname:  req.Nickname,
			AvatarURL: req.Avatar,
			Status:    "active",
		}
		if err := s.userRepo.Create(user); err != nil {
			return nil, err
		}
		return &LoginResponse{
			NeedsREG: true,
			User:     user,
		}, nil
	}

	token, err := s.GenerateToken(user)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		Token:    token,
		User:     user,
		NeedsREG: false,
	}, nil
}

// GetUserByID gets a user by ID.
func (s *AuthService) GetUserByID(id uint) (*model.User, error) {
	return s.userRepo.FindByID(id)
}

// HashPassword hashes a password.
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPassword checks a password against a hash.
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// ValidateToken validates a JWT token.
func (s *AuthService) ValidateToken(tokenString string) (*model.User, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(s.jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		userID := uint(claims["user_id"].(float64))
		return s.userRepo.FindByID(userID)
	}

	return nil, errors.New("invalid token")
}