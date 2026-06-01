package repository

import (
	"aiwill-planner/t6-affiliate/internal/model"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WithdrawRepository interface {
	Create(req *model.WithdrawRequest) error
	GetByID(id uuid.UUID) (*model.WithdrawRequest, error)
	GetByAffiliateID(affiliateID uuid.UUID, page, pageSize int) ([]model.WithdrawRequest, int64, error)
	Update(req *model.WithdrawRequest) error
	ListByStatus(status string, page, pageSize int) ([]model.WithdrawRequest, int64, error)
	GetTotalWithdrawByAffiliate(affiliateID uuid.UUID) (float64, error)
}

type withdrawRepository struct {
	db *gorm.DB
}

func NewWithdrawRepository(db *gorm.DB) WithdrawRepository {
	return &withdrawRepository{db: db}
}

func (r *withdrawRepository) Create(req *model.WithdrawRequest) error {
	return r.db.Create(req).Error
}

func (r *withdrawRepository) GetByID(id uuid.UUID) (*model.WithdrawRequest, error) {
	var req model.WithdrawRequest
	err := r.db.Where("id = ?", id).First(&req).Error
	if err != nil {
		return nil, err
	}
	return &req, nil
}

func (r *withdrawRepository) GetByAffiliateID(affiliateID uuid.UUID, page, pageSize int) ([]model.WithdrawRequest, int64, error) {
	var requests []model.WithdrawRequest
	var total int64

	r.db.Model(&model.WithdrawRequest{}).Where("affiliate_id = ?", affiliateID).Count(&total)
	err := r.db.Where("affiliate_id = ?", affiliateID).
		Offset((page - 1) * pageSize).Limit(pageSize).
		Order("created_at desc").Find(&requests).Error
	return requests, total, err
}

func (r *withdrawRepository) Update(req *model.WithdrawRequest) error {
	return r.db.Save(req).Error
}

func (r *withdrawRepository) ListByStatus(status string, page, pageSize int) ([]model.WithdrawRequest, int64, error) {
	var requests []model.WithdrawRequest
	var total int64

	r.db.Model(&model.WithdrawRequest{}).Where("status = ?", status).Count(&total)
	err := r.db.Where("status = ?", status).
		Offset((page - 1) * pageSize).Limit(pageSize).
		Order("created_at desc").Find(&requests).Error
	return requests, total, err
}

func (r *withdrawRepository) GetTotalWithdrawByAffiliate(affiliateID uuid.UUID) (float64, error) {
	var result struct {
		Total float64
	}
	err := r.db.Model(&model.WithdrawRequest{}).
		Select("SUM(actual_amount) as total").
		Where("affiliate_id = ? AND status = 'completed'", affiliateID).
		Scan(&result).Error
	return result.Total, err
}