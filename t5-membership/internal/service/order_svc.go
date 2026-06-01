package service

import (
	"errors"
	"t5-membership/internal/model"
	"t5-membership/internal/repository"
)

var (
	ErrPaymentFailed = errors.New("payment failed")
	ErrOrderNotPaid  = errors.New("order not paid")
)

type OrderService interface {
	CreateOrder(userID string, planID uint) (*model.Order, error)
	GetOrder(orderID string) (*model.Order, error)
	GetUserOrders(userID string, page, pageSize int) ([]model.Order, int64, error)
	ConfirmPayment(orderID string, paymentIntentID string) error
	FailOrder(orderID string, message string) error
}

type orderService struct {
	orderRepo repository.OrderRepository
	planRepo  repository.PlanRepository
	paymentSvc PaymentService
}

func NewOrderService(
	orderRepo repository.OrderRepository,
	planRepo repository.PlanRepository,
	paymentSvc PaymentService,
) OrderService {
	return &orderService{
		orderRepo: orderRepo,
		planRepo:  planRepo,
		paymentSvc: paymentSvc,
	}
}

func (s *orderService) CreateOrder(userID string, planID uint) (*model.Order, error) {
	plan, err := s.planRepo.FindByID(planID)
	if err != nil {
		return nil, ErrPlanNotFound
	}

	order := &model.Order{
		UserID: userID,
		PlanID: planID,
		Amount: plan.Price,
		Currency: plan.Currency,
		Status: "pending",
	}

	if err := s.orderRepo.Create(order); err != nil {
		return nil, err
	}

	order.Plan = plan
	return order, nil
}

func (s *orderService) GetOrder(orderID string) (*model.Order, error) {
	order, err := s.orderRepo.FindByID(orderID)
	if err != nil {
		return nil, ErrOrderNotFound
	}
	return order, nil
}

func (s *orderService) GetUserOrders(userID string, page, pageSize int) ([]model.Order, int64, error) {
	offset := (page - 1) * pageSize
	return s.orderRepo.FindByUserID(userID, pageSize, offset)
}

func (s *orderService) ConfirmPayment(orderID string, paymentIntentID string) error {
	order, err := s.orderRepo.FindByID(orderID)
	if err != nil {
		return ErrOrderNotFound
	}

	order.Status = "paid"
	order.StripePaymentID = paymentIntentID
	return s.orderRepo.Update(order)
}

func (s *orderService) FailOrder(orderID string, message string) error {
	order, err := s.orderRepo.FindByID(orderID)
	if err != nil {
		return ErrOrderNotFound
	}

	order.Status = "failed"
	order.FailureMessage = message
	return s.orderRepo.Update(order)
}