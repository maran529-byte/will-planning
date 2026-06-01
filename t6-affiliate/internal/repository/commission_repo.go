package repository

import (
	"aiwill-planner/t6-affiliate/internal/model"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CommissionRepository interface {
	Create(record *model.CommissionRecord) error
	GetByID(id uuid.UUID) (*model.CommissionRecord, error)
	GetByAffiliateID(affiliateID uuid.UUID, page, pageSize int) ([]model.CommissionRecord, int64, error)
	GetByOrderID(orderID string) ([]model.CommissionRecord, error)
	Update(record *model.CommissionRecord) error
	ListByStatus(status string, page, pageSize int) ([]model.CommissionRecord, int64, error)
	GetSummaryByAffiliate(affiliateID uuid.UUID) (total, pending, settled float64, err error)
}

type commissionRepository struct {
	db *gorm.DB
}

func NewCommissionRepository(db *gorm.DB) CommissionRepository {
	return &commissionRepository{db: db}
}

func (r *commissionRepository) Create(record *model.CommissionRecord) error {
	return r.db.Create(record).Error
}

func (r *commissionRepository) GetByID(id uuid.UUID) (*model.CommissionRecord, error) {
	var record model.CommissionRecord
	err := r.db.Where("id = ?", id).First(&record).Error
	if err != nil {
		return nil, err
	}
	return &record, nil
}

func (r *commissionRepository) GetByAffiliateID(affiliateID uuid.UUID, page, pageSize int) ([]model.CommissionRecord, int64, error) {
	var records []model.CommissionRecord
	var total int64

	r.db.Model(&model.CommissionRecord{}).Where("affiliate_id = ?", affiliateID).Count(&total)
	err := r.db.Where("affiliate_id = ?", affiliateID).
		Offset((page - 1) * pageSize).Limit(pageSize).
		Order("created_at desc").Find(&records).Error
	return records, total, err
}

func (r *commissionRepository) GetByOrderID(orderID string) ([]model.CommissionRecord, error) {
	var records []model.CommissionRecord
	err := r.db.Where("order_id = ?", orderID).Find(&records).Error
	return records, err
}

func (r *commissionRepository) Update(record *model.CommissionRecord) error {
	return r.db.Save(record).Error
}

func (r *commissionRepository) ListByStatus(status string, page, pageSize int) ([]model.CommissionRecord, int64, error) {
	var records []model.CommissionRecord
	var total int64

	r.db.Model(&model.CommissionRecord{}).Where("status = ?", status).Count(&total)
	err := r.db.Where("status = ?", status).
		Offset((page - 1) * pageSize).Limit(pageSize).
		Order("created_at desc").Find(&records).Error
	return records, total, err
}

func (r *commissionRepository) GetSummaryByAffiliate(affiliateID uuid.UUID) (total, pending, settled float64, err error) {
	var result struct {
		Total    float64
		Pending  float64
		Settled  float64
	}
	err = r.db.Model(&model.CommissionRecord{}).
		Select("SUM(commission_amt) as total, SUM(CASE WHEN status='pending' THEN commission_amt ELSE 0 END) as pending, SUM(CASE WHEN status='settled' THEN commission_amt ELSE 0 END) as settled").
		Where("affiliate_id = ?", affiliateID).
		Scan(&result).Error
	if err != nil {
		return 0, 0, 0, err
	}
	return result.Total, result.Pending, result.Settled, nil
}