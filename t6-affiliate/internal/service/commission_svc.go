package service

import (
	"aiwill-planner/t6-affiliate/internal/model"
	"aiwill-planner/t6-affiliate/internal/repository"
	"errors"
	"github.com/google/uuid"
	"time"
)

var (
	ErrCommissionNotFound    = errors.New("commission record not found")
	ErrInvalidCommissionRate = errors.New("invalid commission rate")
	ErrOrderAlreadySettled   = errors.New("order already settled")
)

type CommissionService interface {
	CalculateCommission(orderAmount float64, level int) float64
	RecordCommission(affiliateID uuid.UUID, orderID string, orderAmount float64, level int) (*model.CommissionRecord, error)
	SettleCommission(id uuid.UUID) error
	SettleAllPending() (int64, error)
	GetCommissionRecords(affiliateID uuid.UUID, page, pageSize int) ([]model.CommissionRecord, int64, error)
	GetCommissionStats(affiliateID uuid.UUID) (*CommissionStats, error)
}

type CommissionStats struct {
	TotalAmount    float64
	PendingAmount  float64
	SettledAmount  float64
	TotalCount     int64
	PendingCount    int64
}

type commissionService struct {
	commissionRepo repository.CommissionRepository
	affiliateRepo  repository.AffiliateRepository
	level1Rate     float64 // 一级佣金比例
	level2Rate     float64 // 二级佣金比例
}

func NewCommissionService(commissionRepo repository.CommissionRepository, affiliateRepo repository.AffiliateRepository, level1Rate, level2Rate float64) CommissionService {
	return &commissionService{
		commissionRepo: commissionRepo,
		affiliateRepo:  affiliateRepo,
		level1Rate:     level1Rate,
		level2Rate:     level2Rate,
	}
}

func (s *commissionService) CalculateCommission(orderAmount float64, level int) float64 {
	rate := s.level1Rate
	if level == 2 {
		rate = s.level2Rate
	}
	return orderAmount * rate
}

func (s *commissionService) RecordCommission(affiliateID uuid.UUID, orderID string, orderAmount float64, level int) (*model.CommissionRecord, error) {
	// 检查订单是否已结算
	existing, _ := s.commissionRepo.GetByOrderID(orderID)
	if len(existing) > 0 && existing[0].Status == "settled" {
		return nil, ErrOrderAlreadySettled
	}

	rate := s.level1Rate
	if level == 2 {
		rate = s.level2Rate
	}
	commissionAmt := orderAmount * rate

	record := &model.CommissionRecord{
		ID:             uuid.New(),
		AffiliateID:    affiliateID,
		OrderID:        orderID,
		OrderAmount:    orderAmount,
		CommissionRate: rate,
		CommissionAmt:  commissionAmt,
		Level:          level,
		Type:           "sale",
		Status:         "pending",
		CreatedAt:      time.Now(),
	}

	if err := s.commissionRepo.Create(record); err != nil {
		return nil, err
	}

	// 更新分销商的可结算佣金
	affiliate, _ := s.affiliateRepo.GetByID(affiliateID)
	if affiliate != nil {
		affiliate.AvailableCommission += commissionAmt
		s.affiliateRepo.Update(affiliate)
	}

	return record, nil
}

func (s *commissionService) SettleCommission(id uuid.UUID) error {
	record, err := s.commissionRepo.GetByID(id)
	if err != nil {
		return ErrCommissionNotFound
	}

	if record.Status == "settled" {
		return ErrOrderAlreadySettled
	}

	record.Status = "settled"
	now := time.Now()
	record.SettledAt = &now

	// 更新分销商可用佣金和总佣金
	affiliate, _ := s.affiliateRepo.GetByID(record.AffiliateID)
	if affiliate != nil {
		affiliate.AvailableCommission -= record.CommissionAmt
		affiliate.TotalCommission += record.CommissionAmt
		s.affiliateRepo.Update(affiliate)
	}

	return s.commissionRepo.Update(record)
}

func (s *commissionService) SettleAllPending() (int64, error) {
	records, total, err := s.commissionRepo.ListByStatus("pending", 1, 1000)
	if err != nil {
		return 0, err
	}

	var settled int64
	for _, r := range records {
		if err := s.SettleCommission(r.ID); err == nil {
			settled++
		}
	}
	return settled, nil
}

func (s *commissionService) GetCommissionRecords(affiliateID uuid.UUID, page, pageSize int) ([]model.CommissionRecord, int64, error) {
	return s.commissionRepo.GetByAffiliateID(affiliateID, page, pageSize)
}

func (s *commissionService) GetCommissionStats(affiliateID uuid.UUID) (*CommissionStats, error) {
	total, pending, settled, err := s.commissionRepo.GetSummaryByAffiliate(affiliateID)
	if err != nil {
		return nil, err
	}

	return &CommissionStats{
		TotalAmount:   total,
		PendingAmount: pending,
		SettledAmount: settled,
	}, nil
}