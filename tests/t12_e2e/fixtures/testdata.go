// Package fixtures provides test data for E2E tests.
package fixtures

import (
	"time"
)

// TestTenantID is the default test tenant ID.
const TestTenantID = "tenant-e2e"

// TestUserPhone is the default test user phone.
const TestUserPhone = "13800138000"

// TestCode is the default test verification code.
const TestCode = "123456"

// ValidLaborContractData contains valid labor contract test data.
var ValidLaborContractData = map[string]interface{}{
	"company":       "测试科技有限公司",
	"name":          "张三",
	"id_number":     "110101199001011234",
	"phone":         "13800138001",
	"start_date":    "2026-01-01",
	"end_date":      "2027-01-01",
	"position":      "高级工程师",
	"work_location": "北京市朝阳区",
	"salary":        "25000",
	"other_terms":   "试用期3个月，五险一金按国家规定缴纳",
}

// ValidRentalContractData contains valid rental contract test data.
var ValidRentalContractData = map[string]interface{}{
	"owner":     "李四",
	"tenant":    "王五",
	"phone":     "13800138002",
	"item":      "北京市朝阳区某小区1号楼101室",
	"start_date": "2026-02-01",
	"end_date":   "2027-02-01",
	"rent":      "5000",
	"deposit":   "10000",
}

// DefaultContractData contains default contract test data.
var DefaultContractData = map[string]interface{}{
	"title":    "测试合同",
	"content":  "本合同用于测试目的，双方同意以下条款...",
	"template": "default",
}

// LaborContractRequest creates a labor contract generation request.
func LaborContractRequest() map[string]interface{} {
	return map[string]interface{}{
		"title":       "劳动合同_" + time.Now().Format("20060102150405"),
		"template_id": "labor",
		"data":        ValidLaborContractData,
	}
}

// RentalContractRequest creates a rental contract generation request.
func RentalContractRequest() map[string]interface{} {
	return map[string]interface{}{
		"title":       "租赁合同_" + time.Now().Format("20060102150405"),
		"template_id": "rental",
		"data":        ValidRentalContractData,
	}
}

// DefaultContractRequest creates a default contract generation request.
func DefaultContractRequest() map[string]interface{} {
	return map[string]interface{}{
		"title":       "测试合同_" + time.Now().Format("20060102150405"),
		"template_id": "default",
		"data":        DefaultContractData,
	}
}

// ExcessiveAmountContractData contains data with excessive amount for compliance testing.
var ExcessiveAmountContractData = map[string]interface{}{
	"company":       "测试公司",
	"name":          "张三",
	"id_number":     "110101199001011234",
	"phone":         "13800138001",
	"start_date":    "2026-01-01",
	"end_date":      "2027-01-01",
	"position":      "工程师",
	"work_location": "北京",
	"salary":        "999999999", // 超限金额
	"other_terms":   "正常条款",
}

// ProhibitedContentContractData contains data with prohibited terms for compliance testing.
var ProhibitedContentContractData = map[string]interface{}{
	"company":       "测试公司",
	"name":          "张三",
	"id_number":     "110101199001011234",
	"phone":         "13800138001",
	"start_date":    "2026-01-01",
	"end_date":      "2027-01-01",
	"position":      "工程师",
	"work_location": "北京",
	"salary":        "15000",
	"other_terms":   "本条款含有违规内容TEST_PROHIBITED_XXX_123", // 包含禁止词
}

// ExpiredToken is a pre-expired JWT token for testing.
const ExpiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

// InvalidToken is an invalid JWT token for testing.
const InvalidToken = "invalid.token.string"

// ExpectedStatuses contains expected contract statuses for state transition tests.
var ExpectedStatuses = struct {
	Draft   string
	Pending string
	Signed  string
}{
	Draft:   "draft",
	Pending: "pending",
	Signed:  "signed",
}

// ShareResult represents expected share link structure.
type ShareResult struct {
	ShareURL string
	ShareID  string
	Valid    bool
}

// GenerateExpectedShareURL generates an expected share URL pattern.
func GenerateExpectedShareURL(contractID uint) string {
	return "https://aiwill.com/share/" + string(rune(contractID))
}

// MultiTenantScenarios contains test data for multi-tenant isolation tests.
var MultiTenantScenarios = []struct {
	TenantID   string
	TenantName string
	UserPhone  string
}{
	{TenantID: "tenant-a", TenantName: "租户A", UserPhone: "13800000001"},
	{TenantID: "tenant-b", TenantName: "租户B", UserPhone: "13800000002"},
}

// ConcurrentSignUsers contains user data for concurrent signing tests.
var ConcurrentSignUsers = []struct {
	UserID    uint
	Phone     string
	SignData  string
}{
	{UserID: 1, Phone: "13900000001", SignData: "signature_data_user_1"},
	{UserID: 2, Phone: "13900000002", SignData: "signature_data_user_2"},
	{UserID: 3, Phone: "13900000003", SignData: "signature_data_user_3"},
	{UserID: 4, Phone: "13900000004", SignData: "signature_data_user_4"},
	{UserID: 5, Phone: "13900000005", SignData: "signature_data_user_5"},
}