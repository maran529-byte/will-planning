package repository

import (
	"aiwill-planner/t8-miniprogram/internal/model"
	"errors"

	"gorm.io/gorm"
)

// Common errors
var (
	ErrUserNotFound    = errors.New("user not found")
	ErrContractNotFound = errors.New("contract not found")
)

// UserRepository handles user data access.
type UserRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a new UserRepository.
func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

// FindByOpenID finds a user by openid.
func (r *UserRepository) FindByOpenID(openid string) (*model.User, error) {
	var user model.User
	err := r.db.Where("open_id = ?", openid).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// Create creates a new user.
func (r *UserRepository) Create(user *model.User) error {
	return r.db.Create(user).Error
}

// Update updates a user.
func (r *UserRepository) Update(user *model.User) error {
	return r.db.Save(user).Error
}

// FindByID finds a user by id.
func (r *UserRepository) FindByID(id uint) (*model.User, error) {
	var user model.User
	err := r.db.First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}