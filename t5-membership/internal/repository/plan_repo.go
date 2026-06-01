package repository

import (
	"t5-membership/internal/model"

	"gorm.io/gorm"
)

type PlanRepository interface {
	Create(plan *model.SubscriptionPlan) error
	Update(plan *model.SubscriptionPlan) error
	FindByID(id uint) (*model.SubscriptionPlan, error)
	FindAll(activeOnly bool) ([]model.SubscriptionPlan, error)
	FindByStripePriceID(stripePriceID string) (*model.SubscriptionPlan, error)
}

type planRepository struct {
	db *gorm.DB
}

func NewPlanRepository(db *gorm.DB) PlanRepository {
	return &planRepository{db: db}
}

func (r *planRepository) Create(plan *model.SubscriptionPlan) error {
	return r.db.Create(plan).Error
}

func (r *planRepository) Update(plan *model.SubscriptionPlan) error {
	return r.db.Save(plan).Error
}

func (r *planRepository) FindByID(id uint) (*model.SubscriptionPlan, error) {
	var p model.SubscriptionPlan
	err := r.db.First(&p, id).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *planRepository) FindAll(activeOnly bool) ([]model.SubscriptionPlan, error) {
	var plans []model.SubscriptionPlan
	query := r.db
	if activeOnly {
		query = query.Where("is_active = ?", true)
	}
	err := query.Find(&plans).Error
	return plans, err
}

func (r *planRepository) FindByStripePriceID(stripePriceID string) (*model.SubscriptionPlan, error) {
	var p model.SubscriptionPlan
	err := r.db.Where("stripe_price_id = ?", stripePriceID).First(&p).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}