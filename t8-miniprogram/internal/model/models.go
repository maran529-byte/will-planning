package model

import (
	"time"
)

// User represents a miniprogram user.
type User struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	OpenID    string    `gorm:"uniqueIndex;size:128" json:"open_id"`
	Nickname  string    `gorm:"size:64" json:"nickname"`
	AvatarURL string    `gorm:"size:512" json:"avatar_url"`
	Phone     string    `gorm:"size:20" json:"phone"`
	Status    string    `gorm:"size:20;default:active" json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Contract represents a contract document.
type Contract struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	UserID      uint      `gorm:"index" json:"user_id"`
	Title       string    `gorm:"size:256" json:"title"`
	TemplateID  string    `gorm:"size:64" json:"template_id"`
	Status      string    `gorm:"size:20;default:draft" json:"status"`
	Content     string    `gorm:"type:text" json:"content"`
	FilePath    string    `gorm:"size:512" json:"file_path"`
	Checksum    string    `gorm:"size:64" json:"checksum"`
	SignData    string    `gorm:"type:text" json:"sign_data"`
	SignedAt    *time.Time `json:"signed_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// SignRecord represents a signature record.
type SignRecord struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ContractID uint     `gorm:"index" json:"contract_id"`
	UserID    uint      `gorm:"index" json:"user_id"`
	SignType  string    `gorm:"size:20" json:"sign_type"`
	SignData  string    `gorm:"type:text" json:"sign_data"`
	IP        string    `gorm:"size:45" json:"ip"`
	UserAgent string    `gorm:"size:512" json:"user_agent"`
	CreatedAt time.Time `json:"created_at"`
}