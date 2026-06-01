package service

import (
	"aiwill-planner/t6-affiliate/internal/model"
	"aiwill-planner/t6-affiliate/internal/repository"
	"errors"
	"github.com/google/uuid"
	"strings"
)

var (
	ErrAffiliateNotFound     = errors.New("affiliate not found")
	ErrAffiliateExists       = errors.New("affiliate already exists")
	ErrInvalidInviteCode     = errors.New("invalid invite code")
	ErrInvalidLevel          = errors.New("invalid level")
)

type AffiliateService interface {
	CreateAffiliate(userID, name, phone, email string) (*model.Affiliate, error)
	GetAffiliate(id uuid.UUID) (*model.Affiliate, error)
	GetAffiliateByUserID(userID string) (*model.Affiliate, error)
	UpdateAffiliate(affiliate *model.Affiliate) error
	SuspendAffiliate(id uuid.UUID) error
	ActivateAffiliate(id uuid.UUID) error
	ListAffiliates(page, pageSize int) ([]model.Affiliate, int64, error)
	UpgradeLevel(id uuid.UUID, newLevel model.AffiliateLevel) error
	GetAffiliateStats(id uuid.UUID) (*AffiliateStats, error)
}

type AffiliateStats struct {
	DirectCount   int64
	IndirectCount int64
	TotalSales    float64
	TotalCommission float64
	AvailableCommission float64
}

type affiliateService struct {
	affiliateRepo repository.AffiliateRepository
	inviteRepo    repository.InviteRepository
}

func NewAffiliateService(affiliateRepo repository.AffiliateRepository, inviteRepo repository.InviteRepository) AffiliateService {
	return &affiliateService{
		affiliateRepo: affiliateRepo,
		inviteRepo:    inviteRepo,
	}
}

func (s *affiliateService) generateInviteCode() string {
	return strings.ToUpper(uuid.New().String()[:8])
}

func (s *affiliateService) CreateAffiliate(userID, name, phone, email string) (*model.Affiliate, error) {
	// 检查是否已存在
	existing, _ := s.affiliateRepo.GetByUserID(userID)
	if existing != nil {
		return nil, ErrAffiliateExists
	}

	affiliate := &model.Affiliate{
		ID:        uuid.New(),
		UserID:    userID,
		Name:      name,
		Phone:     phone,
		Email:     email,
		Level:     model.LevelBronze,
		Status:    "active",
		InviteCode: s.generateInviteCode(),
	}

	if err := s.affiliateRepo.Create(affiliate); err != nil {
		return nil, err
	}
	return affiliate, nil
}

func (s *affiliateService) GetAffiliate(id uuid.UUID) (*model.Affiliate, error) {
	affiliate, err := s.affiliateRepo.GetByID(id)
	if err != nil {
		return nil, ErrAffiliateNotFound
	}
	return affiliate, nil
}

func (s *affiliateService) GetAffiliateByUserID(userID string) (*model.Affiliate, error) {
	affiliate, err := s.affiliateRepo.GetByUserID(userID)
	if err != nil {
		return nil, ErrAffiliateNotFound
	}
	return affiliate, nil
}

func (s *affiliateService) UpdateAffiliate(affiliate *model.Affiliate) error {
	return s.affiliateRepo.Update(affiliate)
}

func (s *affiliateService) SuspendAffiliate(id uuid.UUID) error {
	affiliate, err := s.GetAffiliate(id)
	if err != nil {
		return err
	}
	affiliate.Status = "suspended"
	return s.affiliateRepo.Update(affiliate)
}

func (s *affiliateService) ActivateAffiliate(id uuid.UUID) error {
	affiliate, err := s.GetAffiliate(id)
	if err != nil {
		return err
	}
	affiliate.Status = "active"
	return s.affiliateRepo.Update(affiliate)
}

func (s *affiliateService) ListAffiliates(page, pageSize int) ([]model.Affiliate, int64, error) {
	return s.affiliateRepo.List(page, pageSize)
}

func (s *affiliateService) UpgradeLevel(id uuid.UUID, newLevel model.AffiliateLevel) error {
	if newLevel < model.LevelBronze || newLevel > model.LevelPlatinum {
		return ErrInvalidLevel
	}
	affiliate, err := s.GetAffiliate(id)
	if err != nil {
		return err
	}
	affiliate.Level = newLevel
	return s.affiliateRepo.Update(affiliate)
}

func (s *affiliateService) GetAffiliateStats(id uuid.UUID) (*AffiliateStats, error) {
	affiliate, err := s.GetAffiliate(id)
	if err != nil {
		return nil, err
	}

	direct, indirect, _ := s.inviteRepo.GetDownlineCount(affiliate.UserID)

	return &AffiliateStats{
		DirectCount:         direct,
		IndirectCount:       indirect,
		TotalSales:          affiliate.TotalSales,
		TotalCommission:     affiliate.TotalCommission,
		AvailableCommission: affiliate.AvailableCommission,
	}, nil
}