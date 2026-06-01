package repository

import (
	"aiwill-planner/t8-miniprogram/internal/model"

	"gorm.io/gorm"
)

// ContractRepository handles contract data access.
type ContractRepository struct {
	db *gorm.DB
}

// NewContractRepository creates a new ContractRepository.
func NewContractRepository(db *gorm.DB) *ContractRepository {
	return &ContractRepository{db: db}
}

// Create creates a new contract.
func (r *ContractRepository) Create(contract *model.Contract) error {
	return r.db.Create(contract).Error
}

// FindByID finds a contract by id.
func (r *ContractRepository) FindByID(id uint) (*model.Contract, error) {
	var contract model.Contract
	err := r.db.First(&contract, id).Error
	if err != nil {
		return nil, err
	}
	return &contract, nil
}

// FindByUserID finds all contracts for a user.
func (r *ContractRepository) FindByUserID(userID uint) ([]model.Contract, error) {
	var contracts []model.Contract
	err := r.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&contracts).Error
	if err != nil {
		return nil, err
	}
	return contracts, nil
}

// Update updates a contract.
func (r *ContractRepository) Update(contract *model.Contract) error {
	return r.db.Save(contract).Error
}

// Delete deletes a contract.
func (r *ContractRepository) Delete(id uint) error {
	return r.db.Delete(&model.Contract{}, id).Error
}

// CreateSignRecord creates a sign record.
func (r *ContractRepository) CreateSignRecord(record *model.SignRecord) error {
	return r.db.Create(record).Error
}