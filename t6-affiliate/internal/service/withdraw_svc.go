package service

import (
	"aiwill-planner/t6-affiliate/internal/model"
	"aiwill-planner/t6-affiliate/internal/repository"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"time"
)

var (
	ErrWithdrawNotFound      = errors.New("withdraw request not found")
	ErrInsufficientBalance   = errors.New("insufficient balance")
	ErrBelowMinAmount        = errors.New("amount below minimum")
	ErrInvalidStatus         = errors.New("invalid status")
)

type WithdrawService interface {
	ApplyWithdraw(affiliateID uuid.UUID, amount float64, bankName, bankAccount string) (*model.WithdrawRequest, error)
	ProcessWithdraw(id uuid.UUID, status string, rejectReason string) error
	GetWithdrawRequests(affiliateID uuid.UUID, page, pageSize int) ([]model.WithdrawRequest, int64, error)
	GetWithdrawByID(id uuid.UUID) (*model.WithdrawRequest, error)
	ListWithdrawsByStatus(status string, page, pageSize int) ([]model.WithdrawRequest, int64, error)
}

type withdrawService struct {
	withdrawRepo   repository.WithdrawRepository
	affiliateRepo  repository.AffiliateRepository
	minAmount      float64
	feeRate        float64
}

func NewWithdrawService(withdrawRepo repository.WithdrawRepository, affiliateRepo repository.AffiliateRepository, minAmount, feeRate float64) WithdrawService {
	return &withdrawService{
		withdrawRepo:  withdrawRepo,
		affiliateRepo: affiliateRepo,
		minAmount:     minAmount,
		feeRate:       feeRate,
	}
}

func (s *withdrawService) ApplyWithdraw(affiliateID uuid.UUID, amount float64, bankName, bankAccount string) (*model.WithdrawRequest, error) {
	// 检查余额
	affiliate, err := s.affiliateRepo.GetByID(affiliateID)
	if err != nil {
		return nil, errors.New("affiliate not found")
	}

	if amount < s.minAmount {
		return nil, ErrBelowMinAmount
	}

	if affiliate.AvailableCommission < amount {
		return nil, ErrInsufficientBalance
	}

	fee := amount * s.feeRate
	actualAmount := amount - fee

	// 冻结佣金
	affiliate.AvailableCommission -= amount
	// SECURITY: Ensure balance update is checked for errors to prevent inconsistent state
	if err := s.affiliateRepo.Update(affiliate); err != nil {
		return nil, fmt.Errorf("failed to update affiliate balance: %w", err)
	}

	req := &model.WithdrawRequest{
		ID:           uuid.New(),
		AffiliateID:  affiliateID,
		Amount:       amount,
		Fee:          fee,
		ActualAmount: actualAmount,
		BankName:     bankName,
		BankAccount:  bankAccount,
		Status:       "pending",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.withdrawRepo.Create(req); err != nil {
		// 回滚冻结
		affiliate.AvailableCommission += amount
		// Log error but prefer returning original error
		_ = s.affiliateRepo.Update(affiliate)
		return nil, fmt.Errorf("withdraw request failed: %w", err)
	}

	return req, nil
}

func (s *withdrawService) ProcessWithdraw(id uuid.UUID, status string, rejectReason string) error {
	req, err := s.withdrawRepo.GetByID(id)
	if err != nil {
		return ErrWithdrawNotFound
	}

	if req.Status != "pending" {
		return ErrInvalidStatus
	}

	affiliate, _ := s.affiliateRepo.GetByID(req.AffiliateID)

	switch status {
	case "processing", "completed":
		req.Status = status
		if status == "completed" {
			now := time.Now()
			req.CompletedAt = &now
		}
		req.ProcessTime = &time.Time{}
	case "rejected":
		req.Status = "rejected"
		req.RejectReason = rejectReason
		// 退回冻结的佣金
		if affiliate != nil {
			affiliate.AvailableCommission += req.Amount
			s.affiliateRepo.Update(affiliate)
		}
	default:
		return ErrInvalidStatus
	}

	return s.withdrawRepo.Update(req)
}

func (s *withdrawService) GetWithdrawRequests(affiliateID uuid.UUID, page, pageSize int) ([]model.WithdrawRequest, int64, error) {
	return s.withdrawRepo.GetByAffiliateID(affiliateID, page, pageSize)
}

func (s *withdrawService) GetWithdrawByID(id uuid.UUID) (*model.WithdrawRequest, error) {
	return s.withdrawRepo.GetByID(id)
}

func (s *withdrawService) ListWithdrawsByStatus(status string, page, pageSize int) ([]model.WithdrawRequest, int64, error) {
	return s.withdrawRepo.ListByStatus(status, page, pageSize)
}