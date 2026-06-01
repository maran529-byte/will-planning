package model

import (
	"time"
)

type MembershipStatus string

const (
	StatusActive    MembershipStatus = "active"
	StatusExpired   MembershipStatus = "expired"
	StatusCancelled MembershipStatus = "cancelled"
	StatusPending   MembershipStatus = "pending"
)

type Membership struct {
	ID            uint             `json:"id" gorm:"primaryKey"`
	UserID        string           `json:"user_id" gorm:"uniqueIndex;not null"`
	PlanID        uint             `json:"plan_id" gorm:"not null"`
	Plan          *SubscriptionPlan `json:"plan,omitempty" gorm:"foreignKey:PlanID"`
	Status        MembershipStatus `json:"status" gorm:"default:pending"`
	StartTime     time.Time        `json:"start_time"`
	EndTime       time.Time        `json:"end_time"`
	AutoRenew     bool             `json:"auto_renew" gorm:"default:true"`
	StripeSubID   string           `json:"stripe_subscription_id" gorm:"index"`
	CreatedAt     time.Time        `json:"created_at"`
	UpdatedAt     time.Time        `json:"updated_at"`
}

type SubscriptionPlan struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"not null"`
	Description string    `json:"description"`
	Price       int64     `json:"price" gorm:"not null"`
	Currency    string    `json:"currency" gorm:"default:usd"`
	DurationDays int      `json:"duration_days" gorm:"not null"`
	Features    string    `json:"features" gorm:"type:text"`
	StripePriceID string `json:"stripe_price_id" gorm:"index"`
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Order struct {
	ID              string    `json:"id" gorm:"primaryKey;type:varchar(36)"`
	UserID          string    `json:"user_id" gorm:"index;not null"`
	PlanID          uint      `json:"plan_id" gorm:"not null"`
	Plan            *SubscriptionPlan `json:"plan,omitempty" gorm:"foreignKey:PlanID"`
	Amount          int64     `json:"amount" gorm:"not null"`
	Currency        string    `json:"currency" gorm:"default:usd"`
	Status          string    `json:"status" gorm:"default:pending"`
	StripePaymentID string    `json:"stripe_payment_id" gorm:"index"`
	StripeOrderID   string    `json:"stripe_order_id" gorm:"index"`
	FailureMessage  string    `json:"failure_message"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type Payment struct {
	ID              string    `json:"id" gorm:"primaryKey;type:varchar(36)"`
	OrderID         string    `json:"order_id" gorm:"uniqueIndex;not null"`
	Order           *Order    `json:"order,omitempty" gorm:"foreignKey:OrderID"`
	Amount          int64     `json:"amount" gorm:"not null"`
	Currency        string    `json:"currency" gorm:"default:usd"`
	Status          string    `json:"status" gorm:"default:pending"`
	PaymentMethod   string    `json:"payment_method"`
	TransactionID   string    `json:"transaction_id" gorm:"index"`
	FailureCode     string    `json:"failure_code"`
	FailureMessage  string    `json:"failure_message"`
	PaidAt          *time.Time `json:"paid_at"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}