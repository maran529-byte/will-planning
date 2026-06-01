# T7: Document Renderer Service

A Go microservice for rendering contract data into DOCX and PDF formats.

## Features

- Render contracts to DOCX format
- Render contracts to PDF format
- Template-based rendering
- Audit logging
- Multi-tenant support
- Health check endpoint

## API Endpoints

### Health Check
```
GET /health
```

### Render Contract (JSON Response)
```
POST /api/v1/render
Headers:
  X-Tenant-ID: <tenant_id>
  X-User-ID: <user_id>
Body:
{
  "contract_id": "uuid",
  "title": "Contract Title",
  "content": "<html content>",
  "data": {},
  "format": "docx|pdf"
}
```

### Render and Download
```
POST /api/v1/render/download
Headers:
  X-Tenant-ID: <tenant_id>
  X-User-ID: <user_id>
Body:
{
  "contract_id": "uuid",
  "title": "Contract Title",
  "content": "<html content>",
  "data": {},
  "format": "docx|pdf"
}
```

## Configuration

Environment variables:
- `SERVER_HOST`: Server host (default: 0.0.0.0)
- `SERVER_PORT`: Server port (default: 8087)
- `TEMPLATES_PATH`: Path to templates (default: ./templates)
- `OUTPUT_PATH`: Path for output files (default: ./output)
- `AUDIT_LOG_PATH`: Path for audit logs (default: /var/log/aiwill/audit)

## Project Structure

```
t7-document-renderer/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── config/
│   ├── audit/
│   ├── tenant/
│   ├── renderer/
│   └── handler/
├── templates/
├── go.mod
└── README.md
```

## Building

```bash
go mod tidy
go build -o bin/server ./cmd/server
```

## Running

```bash
./bin/server
```