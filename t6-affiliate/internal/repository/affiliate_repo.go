package repository

import (
	"aiwill-planner/t6-affiliate/internal/model"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AffiliateRepository interface {
	Create(affiliate *model.Affiliate) error
	GetByID(id uuid.UUID) (*model.Affiliate, error)
	GetByUserID(userID string) (*model.Affiliate, error)
	GetByInviteCode(code string) (*model.Affiliate, error)
	Update(affiliate *model.Affiliate) error
	List(page, pageSize int) ([]model.Affiliate, int64, error)
	GetSubAffiliates(inviterID string, level int) ([]model.Affiliate, error)
}

type affiliateRepository struct {
	db *gorm.DB
}

func NewAffiliateRepository(db *gorm.DB) AffiliateRepository {
	return &affiliateRepository{db: db}
}

func (r *affiliateRepository) Create(affiliate *model.Affiliate) error {
	return r.db.Create(affiliate).Error
}

func (r *affiliateRepository) GetByID(id uuid.UUID) (*model.Affiliate, error) {
	var affiliate model.Affiliate
	err := r.db.Where("id = ?", id).First(&affiliate).Error
	if err != nil {
		return nil, err
	}
	return &affiliate, nil
}

func (r *affiliateRepository) GetByUserID(userID string) (*model.Affiliate, error) {
	var affiliate model.Affiliate
	err := r.db.Where("user_id = ?", userID).First(&affiliate).Error
	if err != nil {
		return nil, err
	}
	return &affiliate, nil
}

func (r *affiliateRepository) GetByInviteCode(code string) (*model.Affiliate, error) {
	var affiliate model.Affiliate
	err := r.db.Where("invite_code = ?", code).First(&affiliate).Error
	if err != nil {
		return nil, err
	}
	return &affiliate, nil
}

func (r *affiliateRepository) Update(affiliate *model.Affiliate) error {
	return r.db.Save(affiliate).Error
}

func (r *affiliateRepository) List(page, pageSize int) ([]model.Affiliate, int64, error) {
	var affiliates []model.Affiliate
	var total int64

	r.db.Model(&model.Affiliate{}).Count(&total)
	err := r.db.Offset((page - 1) * pageSize).Limit(pageSize).Order("created_at desc").Find(&affiliates).Error
	return affiliates, total, err
}

func (r *affiliateRepository) GetSubAffiliates(inviterID string, level int) ([]model.Affiliate, error) {
	var affiliates []model.Affiliate
	err := r.db.Where("inviter_id = ? AND level = ?", inviterID, level).Find(&affiliates).Error
	return affiliates, err
}