package repository

import (
	"aiwill-planner/t6-affiliate/internal/model"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type InviteRepository interface {
	Create(invite *model.AffiliateInvite) error
	GetByInviteeID(inviteeID string) (*model.AffiliateInvite, error)
	GetByInviterID(inviterID string, page, pageSize int) ([]model.AffiliateInvite, int64, error)
	GetInviteTree(inviterID string) ([]model.AffiliateInvite, error)
	GetDownlineCount(inviterID string) (direct, indirect int64, err error)
}

type inviteRepository struct {
	db *gorm.DB
}

func NewInviteRepository(db *gorm.DB) InviteRepository {
	return &inviteRepository{db: db}
}

func (r *inviteRepository) Create(invite *model.AffiliateInvite) error {
	return r.db.Create(invite).Error
}

func (r *inviteRepository) GetByInviteeID(inviteeID string) (*model.AffiliateInvite, error) {
	var invite model.AffiliateInvite
	err := r.db.Where("invitee_id = ?", inviteeID).First(&invite).Error
	if err != nil {
		return nil, err
	}
	return &invite, nil
}

func (r *inviteRepository) GetByInviterID(inviterID string, page, pageSize int) ([]model.AffiliateInvite, int64, error) {
	var invites []model.AffiliateInvite
	var total int64

	r.db.Model(&model.AffiliateInvite{}).Where("inviter_id = ?", inviterID).Count(&total)
	err := r.db.Where("inviter_id = ?", inviterID).
		Offset((page - 1) * pageSize).Limit(pageSize).
		Order("created_at desc").Find(&invites).Error
	return invites, total, err
}

func (r *inviteRepository) GetInviteTree(inviterID string) ([]model.AffiliateInvite, error) {
	var invites []model.AffiliateInvite
	err := r.db.Where("inviter_id = ?", inviterID).Find(&invites).Error
	return invites, err
}

func (r *inviteRepository) GetDownlineCount(inviterID string) (direct, indirect int64, err error) {
	r.db.Model(&model.AffiliateInvite{}).Where("inviter_id = ? AND level = 1", inviterID).Count(&direct)
	r.db.Model(&model.AffiliateInvite{}).Where("inviter_id = ? AND level = 2", inviterID).Count(&indirect)
	return direct, indirect, nil
}