package repository

import (
	"t5-membership/internal/model"

	"gorm.io/gorm"
)

type OrderRepository interface {
	Create(order *model.Order) error
	Update(order *model.Order) error
	FindByID(id string) (*model.Order, error)
	FindByUserID(userID string, limit, offset int) ([]model.Order, int64, error)
	FindByStripeOrderID(stripeOrderID string) (*model.Order, error)
	UpdateStatus(id string, status string) error
}

type orderRepository struct {
	db *gorm.DB
}

func NewOrderRepository(db *gorm.DB) OrderRepository {
	return &orderRepository{db: db}
}

func (r *orderRepository) Create(order *model.Order) error {
	return r.db.Create(order).Error
}

func (r *orderRepository) Update(order *model.Order) error {
	return r.db.Save(order).Error
}

func (r *orderRepository) FindByID(id string) (*model.Order, error) {
	var o model.Order
	err := r.db.Preload("Plan").First(&o, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (r *orderRepository) FindByUserID(userID string, limit, offset int) ([]model.Order, int64, error) {
	var orders []model.Order
	var total int64

	r.db.Model(&model.Order{}).Where("user_id = ?", userID).Count(&total)
	err := r.db.Preload("Plan").Where("user_id = ?", userID).
		Order("created_at DESC").Limit(limit).Offset(offset).Find(&orders).Error
	return orders, total, err
}

func (r *orderRepository) FindByStripeOrderID(stripeOrderID string) (*model.Order, error) {
	var o model.Order
	err := r.db.Where("stripe_order_id = ?", stripeOrderID).First(&o).Error
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (r *orderRepository) UpdateStatus(id string, status string) error {
	return r.db.Model(&model.Order{}).Where("id = ?", id).Update("status", status).Error
}