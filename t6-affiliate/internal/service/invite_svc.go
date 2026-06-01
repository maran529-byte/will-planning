package service

import (
	"aiwill-planner/t6-affiliate/internal/model"
	"aiwill-planner/t6-affiliate/internal/repository"
	"errors"
	"github.com/google/uuid"
	"time"
)

var (
	ErrInviteNotFound     = errors.New("invite not found")
	ErrAlreadyInvited     = errors.New("user already invited")
	ErrSelfInvite         = errors.New("cannot invite yourself")
)

type InviteService interface {
	InviteParent(inviterID, inviteeID, inviteCode string) (*model.AffiliateInvite, error)
	GetInviteByInviteeID(inviteeID string) (*model.AffiliateInvite, error)
	GetInvitesByInviterID(inviterID string, page, pageSize int) ([]model.AffiliateInvite, int64, error)
	GetInviteTree(inviterID string) ([]*InviteTreeNode, error)
	CountDownline(inviterID string) (direct, indirect int64, err error)
}

type InviteTreeNode struct {
	InviteeID   string
	InviteeName string
	Level       int
	InviteTime  time.Time
	Children    []*InviteTreeNode
}

type inviteService struct {
	inviteRepo    repository.InviteRepository
	affiliateRepo repository.AffiliateRepository
}

func NewInviteService(inviteRepo repository.InviteRepository, affiliateRepo repository.AffiliateRepository) InviteService {
	return &inviteService{
		inviteRepo:    inviteRepo,
		affiliateRepo: affiliateRepo,
	}
}

func (s *inviteService) InviteParent(inviterID, inviteeID, inviteCode string) (*model.AffiliateInvite, error) {
	if inviterID == inviteeID {
		return nil, ErrSelfInvite
	}

	// 检查被邀请者是否已有邀请关系
	existing, _ := s.inviteRepo.GetByInviteeID(inviteeID)
	if existing != nil {
		return nil, ErrAlreadyInvited
	}

	// 获取邀请者信息
	inviterAffiliate, err := s.affiliateRepo.GetByUserID(inviterID)
	if err != nil {
		return nil, errors.New("inviter not found")
	}

	// 获取被邀请者的分销商信息（如果存在）
	inviteeAffiliate, _ := s.affiliateRepo.GetByUserID(inviteeID)

	inviteeAffiliateID *uuid.UUID
	if inviteeAffiliate != nil {
		inviteeAffiliateID = &inviteeAffiliate.ID
	}

	invite := &model.AffiliateInvite{
		ID:                 uuid.New(),
		InviterID:          inviterID,
		InviteeID:          inviteeID,
		InviterAffiliateID: inviterAffiliate.ID,
		InviteeAffiliateID: inviteeAffiliateID,
		InviteCode:         inviteCode,
		Level:              1, // 直接邀请
		InviteTime:         time.Now(),
		CreatedAt:          time.Now(),
	}

	if err := s.inviteRepo.Create(invite); err != nil {
		return nil, err
	}

	// 更新邀请者的下线数量（如果被邀请者是分销商）
	if inviteeAffiliate != nil {
		inviterAffiliate.TotalSales += 1 // 假设每个邀请增加1个下线
		s.affiliateRepo.Update(inviterAffiliate)
	}

	return invite, nil
}

func (s *inviteService) GetInviteByInviteeID(inviteeID string) (*model.AffiliateInvite, error) {
	invite, err := s.inviteRepo.GetByInviteeID(inviteeID)
	if err != nil {
		return nil, ErrInviteNotFound
	}
	return invite, nil
}

func (s *inviteService) GetInvitesByInviterID(inviterID string, page, pageSize int) ([]model.AffiliateInvite, int64, error) {
	return s.inviteRepo.GetByInviterID(inviterID, page, pageSize)
}

func (s *inviteService) GetInviteTree(inviterID string) ([]*InviteTreeNode, error) {
	invites, err := s.inviteRepo.GetInviteTree(inviterID)
	if err != nil {
		return nil, err
	}

	var nodes []*InviteTreeNode
	for _, inv := range invites {
		affiliate, _ := s.affiliateRepo.GetByUserID(inv.InviteeID)
		name := ""
		if affiliate != nil {
			name = affiliate.Name
		}
		nodes = append(nodes, &InviteTreeNode{
			InviteeID:   inv.InviteeID,
			InviteeName: name,
			Level:       inv.Level,
			InviteTime:  inv.InviteTime,
		})
	}
	return nodes, nil
}

func (s *inviteService) CountDownline(inviterID string) (direct, indirect int64, err error) {
	return s.inviteRepo.GetDownlineCount(inviterID)
}