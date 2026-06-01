package renderer

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"html/template"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

type ContractData struct {
	ID         string
	Title      string
	Content    string
	TemplateID string
	Data       map[string]interface{}
	Status     string
	Checksum   string
	CreatedAt  time.Time
}

type RenderRequest struct {
	ContractID string
	Title      string
	Content    string
	Data       map[string]interface{}
	Format     string
}

type RenderResponse struct {
	FileData []byte
	MIMEType string
	Size     int
}

type Engine struct {
	templatesPath string
	outputPath    string
	maxRetries    int
	templates     map[string]*template.Template
	mu            sync.RWMutex
	logger        *zap.Logger
}

func NewEngine(templatesPath, outputPath string, maxRetries int, logger *zap.Logger) (*Engine, error) {
	engine := &Engine{
		templatesPath: templatesPath,
		outputPath:    outputPath,
		maxRetries:    maxRetries,
		templates:     make(map[string]*template.Template),
		logger:        logger,
	}
	if err := os.MkdirAll(templatesPath, 0755); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(outputPath, 0755); err != nil {
		return nil, err
	}
	return engine, nil
}

func (e *Engine) RenderDOCX(ctx context.Context, req RenderRequest) (RenderResponse, error) {
	e.logger.Info("rendering DOCX", zap.String("contract_id", req.ContractID))

	data, err := e.renderHTML(req)
	if err != nil {
		return RenderResponse{}, fmt.Errorf("rendering html: %w", err)
	}

	docxData, err := e.htmlToDOCX(data)
	if err != nil {
		return RenderResponse{}, fmt.Errorf("converting to DOCX: %w", err)
	}

	return RenderResponse{
		FileData: docxData,
		MIMEType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		Size:     len(docxData),
	}, nil
}

func (e *Engine) RenderPDF(ctx context.Context, req RenderRequest) (RenderResponse, error) {
	e.logger.Info("rendering PDF", zap.String("contract_id", req.ContractID))

	data, err := e.renderHTML(req)
	if err != nil {
		return RenderResponse{}, fmt.Errorf("rendering html: %w", err)
	}

	pdfData, err := e.htmlToPDF(data)
	if err != nil {
		return RenderResponse{}, fmt.Errorf("converting to PDF: %w", err)
	}

	return RenderResponse{
		FileData: pdfData,
		MIMEType: "application/pdf",
		Size:     len(pdfData),
	}, nil
}

func (e *Engine) renderHTML(req RenderRequest) ([]byte, error) {
	var buf bytes.Buffer
	tmpl, err := e.loadTemplate("contract")
	if err != nil {
		tmpl = template.Must(template.New("contract").Parse(req.Content))
	} else {
		err = tmpl.Execute(&buf, req.Data)
		if err != nil {
			return nil, err
		}
	}
	return buf.Bytes(), nil
}

func (e *Engine) loadTemplate(name string) (*template.Template, error) {
	e.mu.RLock()
	if tmpl, ok := e.templates[name]; ok {
		e.mu.RUnlock()
		return tmpl, nil
	}
	e.mu.RUnlock()

	path := filepath.Join(e.templatesPath, name+".html")
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	tmpl := template.Must(template.New(name).Parse(string(data)))

	e.mu.Lock()
	e.templates[name] = tmpl
	e.mu.Unlock()

	return tmpl, nil
}

func (e *Engine) htmlToDOCX(htmlData []byte) ([]byte, error) {
	return htmlData, nil
}

func (e *Engine) htmlToPDF(htmlData []byte) ([]byte, error) {
	return htmlData, nil
}

type Service struct {
	engine *Engine
}

func NewService(engine *Engine) *Service {
	return &Service{engine: engine}
}

func (s *Service) Render(ctx context.Context, tenantID, userID string, req RenderRequest) (RenderResponse, error) {
	switch req.Format {
	case "docx":
		return s.engine.RenderDOCX(ctx, req)
	case "pdf":
		return s.engine.RenderPDF(ctx, req)
	default:
		return RenderResponse{}, fmt.Errorf("unsupported format: %s", req.Format)
	}
}

func ComputeChecksum(data []byte) string {
	hash := sha256.Sum256(data)
	return base64.URLEncoding.EncodeToString(hash[:])
}

func GenerateContractID() string {
	return uuid.New().String()
}