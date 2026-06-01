package service

import (
	"t5-membership/pkg/payment"
)

type PaymentService interface {
	CreatePaymentIntent(amount int64, currency, orderID string) (*payment.PaymentIntent, error)
	ConfirmPayment(paymentIntentID string) error
	CancelPayment(paymentIntentID string) error
	HandleWebhook(payload []byte) error
}

type paymentService struct {
	stripeClient *payment.StripeClient
}

func NewPaymentService(stripeClient *payment.StripeClient) PaymentService {
	return &paymentService{stripeClient: stripeClient}
}

func (s *paymentService) CreatePaymentIntent(amount int64, currency, orderID string) (*payment.PaymentIntent, error) {
	return s.stripeClient.CreatePaymentIntent(amount, currency, orderID)
}

func (s *paymentService) ConfirmPayment(paymentIntentID string) error {
	return s.stripeClient.ConfirmPayment(paymentIntentID)
}

func (s *paymentService) CancelPayment(paymentIntentID string) error {
	return s.stripeClient.CancelPayment(paymentIntentID)
}

func (s *paymentService) HandleWebhook(payload []byte) error {
	return s.stripeClient.HandleWebhook(payload)
}