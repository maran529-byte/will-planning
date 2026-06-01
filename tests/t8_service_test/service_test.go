package service

import (
	"aiwill-planner/t8-miniprogram/internal/model"
	"aiwill-planner/t8-miniprogram/internal/repository"
	"testing"
)

// MockUserRepository is a mock implementation for testing
type MockUserRepository struct {
	users       map[string]*model.User
	usersByID   map[uint]*model.User
	nextID      uint
}

func NewMockUserRepository() *MockUserRepository {
	return &MockUserRepository{
		users:     make(map[string]*model.User),
		usersByID: make(map[uint]*model.User),
		nextID:    1,
	}
}

func (m *MockUserRepository) FindByOpenID(openid string) (*model.User, error) {
	if user, ok := m.users[openid]; ok {
		return user, nil
	}
	return nil, repository.ErrUserNotFound
}

func (m *MockUserRepository) FindByID(id uint) (*model.User, error) {
	if user, ok := m.usersByID[id]; ok {
		return user, nil
	}
	return nil, repository.ErrUserNotFound
}

func (m *MockUserRepository) Create(user *model.User) error {
	user.ID = m.nextID
	m.nextID++
	m.users[user.OpenID] = user
	m.usersByID[user.ID] = user
	return nil
}

func (m *MockUserRepository) Update(user *model.User) error {
	m.users[user.OpenID] = user
	m.usersByID[user.ID] = user
	return nil
}

// MockContractRepository is a mock implementation for testing
type MockContractRepository struct {
	contracts     map[uint]*model.Contract
	contractsByUser map[uint][]model.Contract
	nextID        uint
}

func NewMockContractRepository() *MockContractRepository {
	return &MockContractRepository{
		contracts:     make(map[uint]*model.Contract),
		contractsByUser: make(map[uint][]model.Contract),
		nextID:       1,
	}
}

func (m *MockContractRepository) Create(contract *model.Contract) error {
	contract.ID = m.nextID
	m.nextID++
	m.contracts[contract.ID] = contract
	m.contractsByUser[contract.UserID] = append(m.contractsByUser[contract.UserID], *contract)
	return nil
}

func (m *MockContractRepository) FindByID(id uint) (*model.Contract, error) {
	if contract, ok := m.contracts[id]; ok {
		return contract, nil
	}
	return nil, repository.ErrContractNotFound
}

func (m *MockContractRepository) FindByUserID(userID uint) ([]model.Contract, error) {
	return m.contractsByUser[userID], nil
}

func (m *MockContractRepository) Update(contract *model.Contract) error {
	m.contracts[contract.ID] = contract
	return nil
}

func (m *MockContractRepository) Delete(id uint) error {
	delete(m.contracts, id)
	return nil
}

func (m *MockContractRepository) CreateSignRecord(record *model.SignRecord) error {
	return nil
}

// TestAuthService_Login tests login functionality
func TestAuthService_Login(t *testing.T) {
	// Test 1: New user registration via WeChat code
	t.Run("NewUserRegistration", func(t *testing.T) {
		mockRepo := NewMockUserRepository()
		authSvc := NewAuthService(mockRepo, "test-secret")

		req := &LoginRequest{
			Code:     "test_code_123",
			Nickname: "Test User",
			Avatar:   "https://example.com/avatar.jpg",
		}

		resp, err := authSvc.Login(req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if resp == nil {
			t.Fatal("expected response, got nil")
		}

		if !resp.NeedsREG {
			t.Error("expected NeedsREG to be true for new user")
		}

		if resp.User == nil {
			t.Error("expected user in response")
		}

		if resp.User.OpenID != "wx_test_code_123" {
			t.Errorf("expected openid 'wx_test_code_123', got '%s'", resp.User.OpenID)
		}

		if resp.User.Nickname != "Test User" {
			t.Errorf("expected nickname 'Test User', got '%s'", resp.User.Nickname)
		}
	})

	// Test 2: Existing user login
	t.Run("ExistingUserLogin", func(t *testing.T) {
		mockRepo := NewMockUserRepository()
		authSvc := NewAuthService(mockRepo, "test-secret")

		// First login - creates user
		req := &LoginRequest{
			Code:     "existing_code",
			Nickname: "Existing User",
			Avatar:   "https://example.com/avatar.jpg",
		}

		_, err := authSvc.Login(req)
		if err != nil {
			t.Fatalf("first login failed: %v", err)
		}

		// Second login - should return token
		resp, err := authSvc.Login(req)
		if err != nil {
			t.Fatalf("second login failed: %v", err)
		}

		if resp.NeedsREG {
			t.Error("expected NeedsREG to be false for existing user")
		}

		if resp.Token == "" {
			t.Error("expected token for existing user")
		}
	})
}

// TestAuthService_GenerateToken tests JWT token generation
func TestAuthService_GenerateToken(t *testing.T) {
	t.Run("TokenGeneration", func(t *testing.T) {
		mockRepo := NewMockUserRepository()
		authSvc := NewAuthService(mockRepo, "test-secret")

		user := &model.User{
			ID:     1,
			OpenID: "test_openid",
		}

		token, err := authSvc.GenerateToken(user)
		if err != nil {
			t.Fatalf("failed to generate token: %v", err)
		}

		if token == "" {
			t.Error("expected non-empty token")
		}

		// Validate the generated token
		validatedUser, err := authSvc.ValidateToken(token)
		if err != nil {
			t.Fatalf("failed to validate token: %v", err)
		}

		if validatedUser.ID != user.ID {
			t.Errorf("expected user ID %d, got %d", user.ID, validatedUser.ID)
		}
	})
}

// TestAuthService_ValidateToken tests token validation
func TestAuthService_ValidateToken(t *testing.T) {
	t.Run("ValidToken", func(t *testing.T) {
		mockRepo := NewMockUserRepository()
		authSvc := NewAuthService(mockRepo, "test-secret")

		user := &model.User{ID: 42, OpenID: "test"}
		mockRepo.Create(user)

		token, _ := authSvc.GenerateToken(user)

		validatedUser, err := authSvc.ValidateToken(token)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if validatedUser.ID != 42 {
			t.Errorf("expected user ID 42, got %d", validatedUser.ID)
		}
	})

	t.Run("InvalidToken", func(t *testing.T) {
		mockRepo := NewMockUserRepository()
		authSvc := NewAuthService(mockRepo, "test-secret")

		_, err := authSvc.ValidateToken("invalid.token.here")
		if err == nil {
			t.Error("expected error for invalid token")
		}
	})

	t.Run("TamperedToken", func(t *testing.T) {
		mockRepo := NewMockUserRepository()
		authSvc := NewAuthService(mockRepo, "test-secret")

		// Token signed with different secret
		user := &model.User{ID: 1, OpenID: "test"}
		mockRepo.Create(user)

		token, _ := authSvc.GenerateToken(user)
		// Tamper with the token by changing a character
		tamperedToken := token[:len(token)-5] + "xxxxx"

		_, err := authSvc.ValidateToken(tamperedToken)
		if err == nil {
			t.Error("expected error for tampered token")
		}
	})
}

// TestContractService_GenerateContract tests contract generation
func TestContractService_GenerateContract(t *testing.T) {
	t.Run("LaborContractGeneration", func(t *testing.T) {
		mockRepo := NewMockContractRepository()
		contractSvc := NewContractService(mockRepo)

		req := &ContractRequest{
			Title:      "Test Labor Contract",
			TemplateID: "labor",
			Data: map[string]interface{}{
				"company":      "Acme Corp",
				"name":         "John Doe",
				"id_number":    "123456789012345678",
				"phone":        "13800138000",
				"start_date":   "2024-01-01",
				"end_date":     "2024-12-31",
				"position":     "Engineer",
				"work_location": "Beijing",
				"salary":       "15000",
			},
		}

		resp, err := contractSvc.GenerateContract(1, req)
		if err != nil {
			t.Fatalf("failed to generate contract: %v", err)
		}

		if resp == nil {
			t.Fatal("expected response, got nil")
		}

		if resp.Title != "Test Labor Contract" {
			t.Errorf("expected title 'Test Labor Contract', got '%s'", resp.Title)
		}

		if resp.Status != "draft" {
			t.Errorf("expected status 'draft', got '%s'", resp.Status)
		}

		if resp.Checksum == "" {
			t.Error("expected non-empty checksum")
		}
	})

	t.Run("RentalContractGeneration", func(t *testing.T) {
		mockRepo := NewMockContractRepository()
		contractSvc := NewContractService(mockRepo)

		req := &ContractRequest{
			Title:      "Test Rental Contract",
			TemplateID: "rental",
			Data: map[string]interface{}{
				"owner":      "Owner Name",
				"tenant":     "Tenant Name",
				"phone":      "13800138000",
				"item":       "Apartment",
				"start_date": "2024-01-01",
				"end_date":   "2024-12-31",
				"rent":       "5000",
				"deposit":    "10000",
			},
		}

		resp, err := contractSvc.GenerateContract(1, req)
		if err != nil {
			t.Fatalf("failed to generate contract: %v", err)
		}

		if resp.Status != "draft" {
			t.Errorf("expected status 'draft', got '%s'", resp.Status)
		}
	})
}

// TestContractService_SignContract tests contract signing
func TestContractService_SignContract(t *testing.T) {
	t.Run("SuccessfulSign", func(t *testing.T) {
		mockRepo := NewMockContractRepository()
		contractSvc := NewContractService(mockRepo)

		// Create a draft contract
		req := &ContractRequest{
			Title:      "Test Contract",
			TemplateID: "labor",
			Data:       map[string]interface{}{"title": "Test"},
		}
		contractResp, _ := contractSvc.GenerateContract(1, req)

		// Sign the contract
		err := contractSvc.SignContract(contractResp.ID, 1, "signature_data", "127.0.0.1", "test-agent")
		if err != nil {
			t.Fatalf("failed to sign contract: %v", err)
		}

		// Verify contract is signed
		signed, _ := contractSvc.GetContract(contractResp.ID)
		if signed.Status != "signed" {
			t.Errorf("expected status 'signed', got '%s'", signed.Status)
		}

		if signed.SignedAt == nil {
			t.Error("expected signed_at to be set")
		}
	})

	t.Run("SignByNonOwner", func(t *testing.T) {
		mockRepo := NewMockContractRepository()
		contractSvc := NewContractService(mockRepo)

		// Create a draft contract for user 1
		req := &ContractRequest{
			Title:      "Test Contract",
			TemplateID: "labor",
			Data:       map[string]interface{}{"title": "Test"},
		}
		contractResp, _ := contractSvc.GenerateContract(1, req)

		// Try to sign with different user (user 2)
		err := contractSvc.SignContract(contractResp.ID, 2, "signature_data", "127.0.0.1", "test-agent")
		if err == nil {
			t.Error("expected error when non-owner tries to sign")
		}
	})

	t.Run("DoubleSign", func(t *testing.T) {
		mockRepo := NewMockContractRepository()
		contractSvc := NewContractService(mockRepo)

		// Create and sign a contract
		req := &ContractRequest{
			Title:      "Test Contract",
			TemplateID: "labor",
			Data:       map[string]interface{}{"title": "Test"},
		}
		contractResp, _ := contractSvc.GenerateContract(1, req)
		contractSvc.SignContract(contractResp.ID, 1, "sig1", "127.0.0.1", "agent")

		// Try to sign again
		err := contractSvc.SignContract(contractResp.ID, 1, "sig2", "127.0.0.1", "agent")
		if err == nil {
			t.Error("expected error when signing already signed contract")
		}
	})
}

// TestContractService_ListContracts tests listing contracts
func TestContractService_ListContracts(t *testing.T) {
	t.Run("ListUserContracts", func(t *testing.T) {
		mockRepo := NewMockContractRepository()
		contractSvc := NewContractService(mockRepo)

		// Create contracts for user 1
		for i := 0; i < 3; i++ {
			req := &ContractRequest{
				Title:      "Test Contract",
				TemplateID: "labor",
				Data:       map[string]interface{}{"title": "Test"},
			}
			contractSvc.GenerateContract(1, req)
		}

		// Create contract for user 2
		req := &ContractRequest{
			Title:      "User 2 Contract",
			TemplateID: "labor",
			Data:       map[string]interface{}{"title": "Test"},
		}
		contractSvc.GenerateContract(2, req)

		// List contracts for user 1
		contracts, err := contractSvc.ListContracts(1)
		if err != nil {
			t.Fatalf("failed to list contracts: %v", err)
		}

		if len(contracts) != 3 {
			t.Errorf("expected 3 contracts for user 1, got %d", len(contracts))
		}
	})
}

// TestAuthService_PasswordHashing tests password functions
func TestAuthService_PasswordHashing(t *testing.T) {
	t.Run("HashAndCheck", func(t *testing.T) {
		password := "securePassword123"

		hash, err := HashPassword(password)
		if err != nil {
			t.Fatalf("failed to hash password: %v", err)
		}

		if hash == password {
			t.Error("hash should not equal plain password")
		}

		if !CheckPassword(password, hash) {
			t.Error("CheckPassword should return true for correct password")
		}

		if CheckPassword("wrongPassword", hash) {
			t.Error("CheckPassword should return false for wrong password")
		}
	})
}