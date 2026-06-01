package payment

import (
	"fmt"
	"os"
	"sync"

	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/paymentintent"
	"github.com/stripe/stripe-go/v76/webhook"
)

type PaymentIntent struct {
	ID       string `json:"id"`
	ClientID string `json:"client_secret"`
	Status   string `json:"status"`
}

type StripeClient struct {
	apiKey string
}

var (
	client *StripeClient
	once   sync.Once
)

func NewStripeClient(apiKey string) *StripeClient {
	once.Do(func() {
		stripe.Key = apiKey
		client = &StripeClient{apiKey: apiKey}
	})
	return client
}

func (s *StripeClient) CreatePaymentIntent(amount int64, currency, orderID string) (*PaymentIntent, error) {
	params := &stripe.PaymentIntentParams{
		Amount:   stripe.Int64(amount),
		Currency: stripe.String(currency),
		Metadata: map[string]string{
			"order_id": orderID,
		},
		AutomaticPaymentMethods: &stripe.PaymentIntentAutomaticPaymentMethodsParams{
			Enabled: stripe.Bool(true),
		},
	}

	pi, err := paymentintent.New(params)
	if err != nil {
		return nil, fmt.Errorf("failed to create payment intent: %w", err)
	}

	return &PaymentIntent{
		ID:       pi.ID,
		ClientID: pi.ClientSecret,
		Status:   string(pi.Status),
	}, nil
}

func (s *StripeClient) ConfirmPayment(paymentIntentID string) error {
	pi, err := paymentintent.Get(paymentIntentID, nil)
	if err != nil {
		return fmt.Errorf("failed to get payment intent: %w", err)
	}

	if pi.Status != stripe.PaymentIntentStatusSucceeded {
		return fmt.Errorf("payment not succeeded: %s", pi.Status)
	}

	return nil
}

func (s *StripeClient) CancelPayment(paymentIntentID string) error {
	params := &stripe.PaymentIntentParams{}
	_, err := paymentintent.Cancel(paymentIntentID, params)
	return err
}

func (s *StripeClient) HandleWebhook(payload []byte) error {
	const defaultTimeout = 300
	event, err := webhook.ConstructEvent(payload, os.Getenv("STRIPE_WEBHOOK_SECRET"), "", defaultTimeout)
	if err != nil {
		return fmt.Errorf("webhook signature verification failed: %w", err)
	}

	switch event.Type {
	case "payment_intent.succeeded":
		return nil
	case "payment_intent.payment_failed":
		return fmt.Errorf("payment failed")
	default:
		return nil
	}
}