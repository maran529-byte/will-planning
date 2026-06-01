package repository

import (
	"t5-membership/internal/model"

	"gorm.io/gorm"
)

type MembershipRepository interface {
	Create(membership *model.Membership) error
	Update(membership *model.Membership) error
	FindByUserID(userID string) (*model.Membership, error)
	FindByID(id uint) (*model.Membership, error)
	FindActiveByUserID(userID string) (*model.Membership, error)
}

type membershipRepository struct {
	db *gorm.DB
}

func NewMembershipRepository(db *gorm.DB) MembershipRepository {
	return &membershipRepository{db: db}
}

func (r *membershipRepository) Create(membership *model.Membership) error {
	return r.db.Create(membership).Error
}

func (r *membershipRepository) Update(membership *model.Membership) error {
	return r.db.Save(membership).Error
}

func (r *membershipRepository) FindByUserID(userID string) (*model.Membership, error) {
	var m model.Membership
	err := r.db.Preload("Plan").Where("user_id = ?", userID).First(&m).Error
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *membershipRepository) FindByID(id uint) (*model.Membership, error) {
	var m model.Membership
	err := r.db.Preload("Plan").First(&m, id).Error
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *membershipRepository) FindActiveByUserID(userID string) (*model.Membership, error) {
	var m model.Membership
	err := r.db.Preload("Plan").
		Where("user_id = ? AND status = ? AND end_time > NOW()", userID, model.StatusActive).
		First(&m).Error
	if err != nil {
		return nil, err
	}
	return &m, nil
}