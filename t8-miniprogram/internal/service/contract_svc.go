package service

import (
	"aiwill-planner/t8-miniprogram/internal/model"
	"aiwill-planner/t8-miniprogram/internal/repository"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"
)

// ContractService handles contract operations.
type ContractService struct {
	contractRepo *repository.ContractRepository
}

// NewContractService creates a new ContractService.
func NewContractService(contractRepo *repository.ContractRepository) *ContractService {
	return &ContractService{
		contractRepo: contractRepo,
	}
}

// ContractRequest represents a contract generation request.
type ContractRequest struct {
	Title      string                 `json:"title"`
	TemplateID string                 `json:"template_id"`
	Data       map[string]interface{} `json:"data"`
}

// ContractResponse represents a contract response.
type ContractResponse struct {
	ID         uint      `json:"id"`
	Title      string    `json:"title"`
	Status     string    `json:"status"`
	Checksum   string    `json:"checksum"`
	FilePath   string    `json:"file_path,omitempty"`
	SignedAt   *time.Time `json:"signed_at,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

// GenerateContract generates a new contract.
func (s *ContractService) GenerateContract(userID uint, req *ContractRequest) (*ContractResponse, error) {
	// Build contract content from template and data
	content := buildContractContent(req.TemplateID, req.Data)

	// Calculate checksum
	hash := sha256.Sum256([]byte(content))
	checksum := hex.EncodeToString(hash[:])

	contract := &model.Contract{
		UserID:     userID,
		Title:      req.Title,
		TemplateID: req.TemplateID,
		Status:     "draft",
		Content:    content,
		Checksum:   checksum,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	if err := s.contractRepo.Create(contract); err != nil {
		return nil, err
	}

	return &ContractResponse{
		ID:        contract.ID,
		Title:     contract.Title,
		Status:    contract.Status,
		Checksum:  contract.Checksum,
		CreatedAt: contract.CreatedAt,
	}, nil
}

// ListContracts lists all contracts for a user.
func (s *ContractService) ListContracts(userID uint) ([]ContractResponse, error) {
	contracts, err := s.contractRepo.FindByUserID(userID)
	if err != nil {
		return nil, err
	}

	responses := make([]ContractResponse, len(contracts))
	for i, c := range contracts {
		responses[i] = ContractResponse{
			ID:        c.ID,
			Title:     c.Title,
			Status:    c.Status,
			Checksum:  c.Checksum,
			FilePath:  c.FilePath,
			SignedAt:  c.SignedAt,
			CreatedAt: c.CreatedAt,
		}
	}

	return responses, nil
}

// GetContract gets a contract by ID.
func (s *ContractService) GetContract(contractID uint) (*model.Contract, error) {
	return s.contractRepo.FindByID(contractID)
}

// SignContract signs a contract.
func (s *ContractService) SignContract(contractID uint, userID uint, signData string, ip, userAgent string) error {
	contract, err := s.contractRepo.FindByID(contractID)
	if err != nil {
		return err
	}

	if contract.UserID != userID {
		return fmt.Errorf("unauthorized")
	}

	if contract.Status == "signed" {
		return fmt.Errorf("contract already signed")
	}

	now := time.Now()
	contract.Status = "signed"
	contract.SignData = signData
	contract.SignedAt = &now
	contract.UpdatedAt = now

	if err := s.contractRepo.Update(contract); err != nil {
		return err
	}

	// Create sign record
	record := &model.SignRecord{
		ContractID: contractID,
		UserID:     userID,
		SignType:   "wechat",
		SignData:   signData,
		IP:         ip,
		UserAgent:  userAgent,
		CreatedAt:  now,
	}

	return s.contractRepo.CreateSignRecord(record)
}

// buildContractContent builds contract content from template and data.
func buildContractContent(templateID string, data map[string]interface{}) string {
	// Simple template building - in production would use proper template engine
	var content string

	switch templateID {
	case "labor":
		content = fmt.Sprintf(`劳动合同

甲方（用人单位）：%v
乙方（劳动者）：%v
身份证号：%v
联系电话：%v

根据《劳动合同法》及相关法律法规，甲乙双方本着平等自愿的原则签订本合同。

一、合同期限
起始日期：%v
结束日期：%v

二、工作内容
岗位：%v
工作地点：%v

三、薪酬待遇
月薪：%v元

四、社会保险
按国家规定缴纳。

五、其他条款
%v

甲方（签章）：__________  乙方（签章）：__________
日期：%v
`, data["company"], data["name"], data["id_number"], data["phone"],
			data["start_date"], data["end_date"], data["position"], data["work_location"],
			data["salary"], data["other_terms"], time.Now().Format("2006-01-02"))

	case "rental":
		content = fmt.Sprintf(`租赁合同

甲方（出租方）：%v
乙方（承租方）：%v
联系电话：%v

一、租赁物品：%v
二、租赁期限：%v至%v
三、租金：%v元/月
四、押金：%v元

甲方（签章）：__________  乙方（签章）：__________
日期：%v
`, data["owner"], data["tenant"], data["phone"], data["item"],
			data["start_date"], data["end_date"], data["rent"], data["deposit"],
			time.Now().Format("2006-01-02"))

	default:
		content = fmt.Sprintf(`合同

标题：%v
模板：%v

内容：
%v

日期：%v
`, data["title"], templateID, data["content"], time.Now().Format("2006-01-02"))
	}

	return content
}