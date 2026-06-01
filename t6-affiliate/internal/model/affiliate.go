package model

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// AffiliateLevel 分销商等级
type AffiliateLevel int

const (
	LevelBronze AffiliateLevel = iota
	LevelSilver
	LevelGold
	LevelPlatinum
)

func (l AffiliateLevel) String() string {
	switch l {
	case LevelBronze:
		return "bronze"
	case LevelSilver:
		return "silver"
	case LevelGold:
		return "gold"
	case LevelPlatinum:
		return "platinum"
	default:
		return "unknown"
	}
}

// Affiliate 分销商
type Affiliate struct {
	ID                  uuid.UUID       `json:"id" gorm:"type:char(36);primaryKey"`
	UserID              string          `json:"user_id" gorm:"type:varchar(64);uniqueIndex;not null"`
	Level               AffiliateLevel  `json:"level" gorm:"type:int;default:0"`
	Name                string          `json:"name" gorm:"type:varchar(100)"`
	Phone               string          `json:"phone" gorm:"type:varchar(20)"`
	Email               string          `json:"email" gorm:"type:varchar(100)"`
	Status              string          `json:"status" gorm:"type:varchar(20);default:'active'"` // active, suspended, banned
	TotalCommission     decimal.Decimal `json:"total_commission" gorm:"type:decimal(20,2);default:0"`
	AvailableCommission decimal.Decimal `json:"available_commission" gorm:"type:decimal(20,2);default:0"`
	TotalSales          decimal.Decimal `json:"total_sales" gorm:"type:decimal(20,2);default:0"`
	InviteCode          string          `json:"invite_code" gorm:"type:varchar(20);uniqueIndex"`
	CreatedAt           time.Time       `json:"created_at"`
	UpdatedAt           time.Time       `json:"updated_at"`
}

// AffiliateInvite 邀请关系
type AffiliateInvite struct {
	ID                 uuid.UUID  `json:"id" gorm:"type:char(36);primaryKey"`
	InviterID          string     `json:"inviter_id" gorm:"type:varchar(64);index"`
	InviteeID          string     `json:"invitee_id" gorm:"type:varchar(64);index"`
	InviterAffiliateID uuid.UUID  `json:"inviter_affiliate_id" gorm:"type:char(36);index"`
	InviteeAffiliateID *uuid.UUID `json:"invitee_affiliate_id" gorm:"type:char(36);index"`
	InviteCode         string     `json:"invite_code" gorm:"type:varchar(20)"`
	Level              int        `json:"level" gorm:"type:int;default:1"` // 1=直接邀请, 2=二级邀请
	InviteTime         time.Time  `json:"invite_time"`
	CreatedAt          time.Time  `json:"created_at"`
}

// CommissionRecord 佣金记录
type CommissionRecord struct {
	ID             uuid.UUID       `json:"id" gorm:"type:char(36);primaryKey"`
	AffiliateID    uuid.UUID       `json:"affiliate_id" gorm:"type:char(36);index"`
	OrderID        string          `json:"order_id" gorm:"type:varchar(64);index"`
	OrderAmount    decimal.Decimal `json:"order_amount" gorm:"type:decimal(20,2)"`
	CommissionRate decimal.Decimal `json:"commission_rate" gorm:"type:decimal(5,4)"`
	CommissionAmt  decimal.Decimal `json:"commission_amt" gorm:"type:decimal(20,2)"`
	Level          int            `json:"level" gorm:"type:int"` // 佣金层级
	Type           string         `json:"type" gorm:"type:varchar(20)"` // sale, reward
	Status         string         `json:"status" gorm:"type:varchar(20);default:'pending'"` // pending, settled, withdrawn
	SettledAt      *time.Time     `json:"settled_at"`
	CreatedAt      time.Time      `json:"created_at"`
}

// WithdrawRequest 提现申请
type WithdrawRequest struct {
	ID           uuid.UUID       `json:"id" gorm:"type:char(36);primaryKey"`
	AffiliateID  uuid.UUID       `json:"affiliate_id" gorm:"type:char(36);index"`
	Amount       decimal.Decimal `json:"amount" gorm:"type:decimal(20,2)"`
	Fee          decimal.Decimal `json:"fee" gorm:"type:decimal(20,2);default:0"`
	ActualAmount decimal.Decimal `json:"actual_amount" gorm:"type:decimal(20,2)"`
	BankName     string          `json:"bank_name" gorm:"type:varchar(50)"`
	BankAccount  string          `json:"bank_account" gorm:"type:varchar(50)"`
	Status       string          `json:"status" gorm:"type:varchar(20);default:'pending'"` // pending, processing, completed, rejected
	RejectReason string          `json:"reject_reason" gorm:"type:varchar(255)"`
	ProcessTime  *time.Time      `json:"process_time"`
	CompletedAt  *time.Time      `json:"completed_at"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
}

// CommissionRule 佣金规则配置
type CommissionRule struct {
	ID                uuid.UUID       `json:"id" gorm:"type:char(36);primaryKey"`
	Level             int            `json:"level" gorm:"type:int;uniqueIndex"` // 1=一级, 2=二级
	Name              string         `json:"name" gorm:"type:varchar(50)"`
	Rate              decimal.Decimal `json:"rate" gorm:"type:decimal(5,4)"` // 佣金比例
	MinAmount         decimal.Decimal `json:"min_amount" gorm:"type:decimal(20,2)"` // 最低提现金额
	MaxAmount         decimal.Decimal `json:"max_amount" gorm:"type:decimal(20,2)"` // 最高提现金额
	WithdrawFeeRate   decimal.Decimal `json:"withdraw_fee_rate" gorm:"type:decimal(5,4);default:0"`
	Status            string          `json:"status" gorm:"type:varchar(20);default:'active'"`
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
}