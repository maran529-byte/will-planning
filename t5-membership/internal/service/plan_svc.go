package service

import (
	"errors"
	"strconv"
	"t5-membership/internal/model"
	"t5-membership/internal/repository"
)

var ErrPlanNotFound = errors.New("plan not found")

type PlanService interface {
	CreatePlan(plan *model.SubscriptionPlan) error
	UpdatePlan(plan *model.SubscriptionPlan) error
	GetPlan(id string) (*model.SubscriptionPlan, error)
	ListPlans() ([]model.SubscriptionPlan, error)
}

type planService struct {
	planRepo repository.PlanRepository
}

func NewPlanService(planRepo repository.PlanRepository) PlanService {
	return &planService{planRepo: planRepo}
}

func (s *planService) CreatePlan(plan *model.SubscriptionPlan) error {
	return s.planRepo.Create(plan)
}

func (s *planService) UpdatePlan(plan *model.SubscriptionPlan) error {
	return s.planRepo.Update(plan)
}

func (s *planService) GetPlan(id string) (*model.SubscriptionPlan, error) {
	pid, err := strconv.ParseUint(id, 10, 64)
	if err != nil {
		return nil, err
	}
	plan, err := s.planRepo.FindByID(uint(pid))
	if err != nil {
		return nil, ErrPlanNotFound
	}
	return plan, nil
}

func (s *planService) ListPlans() ([]model.SubscriptionPlan, error) {
	return s.planRepo.FindAll(true)
}