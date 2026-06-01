package service

import (
	"errors"
	"t5-membership/internal/model"
	"t5-membership/internal/repository"
	"time"
)

var (
	ErrMembershipNotFound = errors.New("membership not found")
	ErrPlanNotFound       = errors.New("plan not found")
	ErrOrderNotFound      = errors.New("order not found")
	ErrAlreadyActive      = errors.New("membership already active")
)

type MembershipService interface {
	CreateMembership(userID string, planID uint) (*model.Membership, error)
	GetMembership(userID string) (*model.Membership, error)
	GetActiveMembership(userID string) (*model.Membership, error)
	CancelMembership(userID string) error
	RenewMembership(userID string) (*model.Membership, error)
}

type membershipService struct {
	membershipRepo repository.MembershipRepository
	planRepo       repository.PlanRepository
	orderRepo      repository.OrderRepository
}

func NewMembershipService(
	membershipRepo repository.MembershipRepository,
	planRepo repository.PlanRepository,
	orderRepo repository.OrderRepository,
) MembershipService {
	return &membershipService{
		membershipRepo: membershipRepo,
		planRepo:       planRepo,
		orderRepo:      orderRepo,
	}
}

func (s *membershipService) CreateMembership(userID string, planID uint) (*model.Membership, error) {
	// 检查是否已有活跃会员
	if existing, _ := s.membershipRepo.FindActiveByUserID(userID); existing != nil {
		return nil, ErrAlreadyActive
	}

	plan, err := s.planRepo.FindByID(planID)
	if err != nil {
		return nil, ErrPlanNotFound
	}

	membership := &model.Membership{
		UserID:    userID,
		PlanID:    planID,
		Status:    model.StatusPending,
		StartTime: time.Now(),
		EndTime:   time.Now().AddDate(0, 0, plan.DurationDays),
		AutoRenew: true,
	}

	if err := s.membershipRepo.Create(membership); err != nil {
		return nil, err
	}

	membership.Plan = plan
	return membership, nil
}

func (s *membershipService) GetMembership(userID string) (*model.Membership, error) {
	membership, err := s.membershipRepo.FindByUserID(userID)
	if err != nil {
		return nil, ErrMembershipNotFound
	}
	return membership, nil
}

func (s *membershipService) GetActiveMembership(userID string) (*model.Membership, error) {
	membership, err := s.membershipRepo.FindActiveByUserID(userID)
	if err != nil {
		return nil, ErrMembershipNotFound
	}
	return membership, nil
}

func (s *membershipService) CancelMembership(userID string) error {
	membership, err := s.membershipRepo.FindActiveByUserID(userID)
	if err != nil {
		return ErrMembershipNotFound
	}

	membership.Status = model.StatusCancelled
	membership.AutoRenew = false
	return s.membershipRepo.Update(membership)
}

func (s *membershipService) RenewMembership(userID string) (*model.Membership, error) {
	membership, err := s.membershipRepo.FindByUserID(userID)
	if err != nil {
		return nil, ErrMembershipNotFound
	}

	plan := membership.Plan
	if plan == nil {
		return nil, ErrPlanNotFound
	}

	// 延期
	membership.EndTime = membership.EndTime.AddDate(0, 0, plan.DurationDays)
	if membership.Status == model.StatusExpired {
		membership.Status = model.StatusActive
	}

	if err := s.membershipRepo.Update(membership); err != nil {
		return nil, err
	}

	return membership, nil
}