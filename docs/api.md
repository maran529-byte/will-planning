# AIWill Planner - Unified API Documentation

**Base URL:** `http://localhost:8080`
**Gateway Port:** 8080

---

## Service Architecture

| Service | Internal Port | Path Prefix |
|---------|---------------|-------------|
| API Gateway | 8080 | `/` |
| Contract Generator | 8081 | `/api/v1/contracts` |
| Membership Service | 8082 | `/api/v1/plans`, `/api/v1/membership`, `/api/v1/orders` |
| Affiliate Service | 8083 | `/api/v1/affiliates`, `/api/v1/commissions`, `/api/v1/withdraws`, `/api/v1/invites` |
| Document Renderer | 8084 | `/api/v1/render` |
| Miniprogram | 8085 | `/api/v1/miniprogram` |
| Compliance Engine | 8086 | `/api/v1/compliance` |

---

## Global Headers

| Header | Description |
|--------|-------------|
| `Authorization` | Bearer JWT token for authenticated requests |
| `X-Tenant-ID` | Tenant identifier for multi-tenancy |
| `X-User-ID` | User identifier for audit logging |

---

## Common Responses

### Success Response
```json
{
  "status": "ok",
  "data": {}
}
```

### Error Response
```json
{
  "error": "error message",
  "code": "ERROR_CODE"
}
```

---

## Gateway Endpoints

### GET /health
Health check endpoint (no auth required).

**Response:** `200 OK`
```json
{"status":"ok"}
```

---

### GET /api/v1/services
Service discovery endpoint.

**Response:** `200 OK`
```json
{
  "services": {
    "contract_generator": "http://localhost:8081",
    "membership": "http://localhost:8082",
    "affiliate": "http://localhost:8083",
    "document_renderer": "http://localhost:8084",
    "miniprogram": "http://localhost:8085",
    "compliance_engine": "http://localhost:8086"
  }
}
```

---

## Contract Generator Service (t4-contract-generator)

### POST /api/v1/contracts/generate
Generate a new contract.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "template_id": "string",
  "title": "string",
  "data": {
    "key": "value"
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "contract-uuid",
  "title": "Contract Title",
  "status": "draft",
  "checksum": "sha256-hash",
  "created_at": "2024-01-01T00:00:00Z",
  "rendered_html": "<html>...</html>"
}
```

---

### GET /api/v1/templates
List available contract templates.

**Response:** `200 OK`
```json
{
  "templates": [...],
  "count": 5
}
```

---

### GET /api/v1/templates/{template_id}
Get a specific template.

**Response:** `200 OK`
```json
{
  "id": "template-uuid",
  "name": "Contract Template",
  "content": "..."
}
```

---

### GET /api/v1/compliance/rules
List compliance rules.

**Response:** `200 OK`
```json
{
  "rules": [...],
  "count": 10
}
```

---

## Membership Service (t5-membership)

### GET /api/v1/plans
List subscription plans.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "Basic Plan",
    "price": 9.99,
    "duration_days": 30
  }
]
```

---

### GET /api/v1/plans/{id}
Get a specific plan.

**Response:** `200 OK`

---

### POST /api/v1/membership
Create a new membership.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "plan_id": 1
}
```

**Response:** `201 Created`

---

### GET /api/v1/membership
Get user's membership.

**Response:** `200 OK`

---

### GET /api/v1/membership/active
Get user's active membership.

**Response:** `200 OK`

---

### DELETE /api/v1/membership
Cancel membership.

**Response:** `200 OK`
```json
{"message": "membership cancelled"}
```

---

### POST /api/v1/membership/renew
Renew membership.

**Response:** `200 OK`

---

### POST /api/v1/orders
Create a new order.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "plan_id": 1
}
```

**Response:** `201 Created`

---

### GET /api/v1/orders
Get user's orders.

**Response:** `200 OK`
```json
{
  "orders": [...],
  "total": 10,
  "page": 1,
  "size": 10
}
```

---

### GET /api/v1/orders/{id}
Get a specific order.

**Response:** `200 OK`

---

## Affiliate Service (t6-affiliate)

### POST /api/v1/affiliates
Create a new affiliate.

**Request Body:**
```json
{
  "user_id": "user-uuid",
  "name": "John Doe",
  "phone": "1234567890",
  "email": "john@example.com"
}
```

**Response:** `201 Created`

---

### GET /api/v1/affiliates
List all affiliates (paginated).

**Query Parameters:**
- `page` (default: 1)
- `pageSize` (default: 20)

**Response:** `200 OK`
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

---

### GET /api/v1/affiliates/{id}
Get affiliate by ID.

**Response:** `200 OK`

---

### GET /api/v1/affiliates/user/{userId}
Get affiliate by user ID.

**Response:** `200 OK`

---

### PUT /api/v1/affiliates/{id}
Update affiliate.

**Request Body:**
```json
{
  "name": "Updated Name",
  "phone": "0987654321",
  "email": "updated@example.com"
}
```

---

### PUT /api/v1/affiliates/{id}/suspend
Suspend affiliate.

**Response:** `200 OK`
```json
{"message": "affiliate suspended"}
```

---

### PUT /api/v1/affiliates/{id}/activate
Activate affiliate.

**Response:** `200 OK`
```json
{"message": "affiliate activated"}
```

---

### PUT /api/v1/affiliates/{id}/upgrade
Upgrade affiliate level.

**Request Body:**
```json
{
  "level": 2
}
```

---

### GET /api/v1/affiliates/{id}/stats
Get affiliate statistics.

**Response:** `200 OK`

---

### POST /api/v1/commissions/calculate
Calculate commission for an order.

**Request Body:**
```json
{
  "order_amount": 100.00,
  "level": 1
}
```

**Response:** `200 OK`
```json
{
  "order_amount": 100.00,
  "commission": 10.00,
  "commission_rate": 1
}
```

---

### POST /api/v1/commissions/record
Record a commission.

**Request Body:**
```json
{
  "affiliate_id": "affiliate-uuid",
  "order_id": "order-uuid",
  "order_amount": 100.00,
  "level": 1
}
```

---

### POST /api/v1/commissions/settle/{id}
Settle a commission.

---

### POST /api/v1/commissions/settle-all
Settle all pending commissions.

**Response:** `200 OK`
```json
{"settled": 5}
```

---

### GET /api/v1/commissions/affiliate/{affiliateId}
Get commission records for an affiliate.

---

### GET /api/v1/commissions/affiliate/{affiliateId}/stats
Get commission statistics.

---

### POST /api/v1/withdraws
Apply for withdrawal.

**Request Body:**
```json
{
  "affiliate_id": "affiliate-uuid",
  "amount": 500.00,
  "bank_name": "Bank of China",
  "bank_account": "1234567890"
}
```

**Response:** `201 Created`

---

### GET /api/v1/withdraws/{id}
Get withdraw request.

---

### PUT /api/v1/withdraws/{id}/process
Process withdraw request.

**Request Body:**
```json
{
  "status": "approved",
  "reject_reason": ""
}
```

---

### GET /api/v1/withdraws/affiliate/{affiliateId}
Get withdraw requests for an affiliate.

---

### GET /api/v1/withdraws/status/{status}
List withdraws by status.

---

### POST /api/v1/invites
Create an invite relationship.

**Request Body:**
```json
{
  "inviter_id": "user-uuid",
  "invitee_id": "user-uuid",
  "invite_code": "ABC123"
}
```

**Response:** `201 Created`

---

### GET /api/v1/invites/invitee/{inviteeId}
Get invite by invitee ID.

---

### GET /api/v1/invites/inviter/{inviterId}
Get invites by inviter ID.

---

### GET /api/v1/invites/inviter/{inviterId}/tree
Get invite tree.

---

### GET /api/v1/invites/inviter/{inviterId}/count
Count downline members.

**Response:** `200 OK`
```json
{
  "direct_count": 5,
  "indirect_count": 20
}
```

---

## Document Renderer Service (t7-document-renderer)

### POST /api/v1/render
Render a document.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "contract_id": "contract-uuid",
  "title": "Contract Title",
  "content": "Contract content...",
  "data": {},
  "format": "pdf"
}
```

**Response:** `200 OK`
```json
{
  "file_data": "base64-encoded-data",
  "mime_type": "application/pdf",
  "size": 1024
}
```

---

### POST /api/v1/render/download
Render and download a document.

**Request Body:** Same as `/api/v1/render`

**Response:** Binary file download with appropriate Content-Type.

---

## Miniprogram Service (t8-miniprogram)

### POST /api/v1/login
Login via WeChat code.

**Request Body:**
```json
{
  "code": "wechat-auth-code"
}
```

**Response:** `200 OK`
```json
{
  "token": "jwt-token",
  "user": {...}
}
```

---

### GET /api/v1/profile
Get user profile.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

---

### GET /api/v1/contracts
List user's contracts.

**Response:** `200 OK`
```json
{
  "contracts": [...],
  "count": 10
}
```

---

### POST /api/v1/contracts
Generate a new contract.

**Request Body:**
```json
{
  "template_id": "template-uuid",
  "title": "My Contract",
  "data": {}
}
```

**Response:** `201 Created`

---

### GET /api/v1/contracts/{id}
Get a specific contract.

---

### POST /api/v1/contracts/{id}/sign
Sign a contract.

**Request Body:**
```json
{
  "sign_data": "signature-data"
}
```

**Response:** `200 OK`
```json
{"message": "contract signed successfully"}
```

---

### GET /api/v1/contracts/{id}/download
Download a contract.

**Response:** Binary file download.

---

## Compliance Engine (t1-compliance-engine)

The compliance engine exposes a minimal HTTP interface for health checks. The actual compliance validation is performed internally by the Contract Generator service before contract generation.

---

## Environment Variables

### Gateway
| Variable | Default | Description |
|----------|---------|-------------|
| `GW_HOST` | `0.0.0.0` | Gateway host |
| `GW_PORT` | `8080` | Gateway port |
| `JWT_SECRET` | - | JWT signing secret |
| `JWT_ISSUER` | `aiwill-planner` | JWT issuer |
| `JWT_AUDIENCE` | `aiwill-api` | JWT audience |
| `SVC_*` | - | Service URLs |

### Contract Generator
| Variable | Default |
|----------|---------|
| `SERVER_PORT` | `8081` |
| `GENERATOR_TEMPLATES_PATH` | `/templates` |
| `COMPLIANCE_RULES_PATH` | `/rules` |

### Membership
| Variable | Default |
|----------|---------|
| `SERVER_PORT` | `8082` |
| `DATABASE_DSN` | - |
| `STRIPE_KEY` | - |

### Affiliate
| Variable | Default |
|----------|---------|
| `SERVER_PORT` | `8083` |
| `DATABASE_HOST` | `mysql` |
| `DATABASE_PORT` | `3306` |

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Request body is invalid |
| `UNAUTHORIZED` | Missing or invalid JWT token |
| `FORBIDDEN` | Access denied |
| `NOT_FOUND` | Resource not found |
| `METHOD_NOT_ALLOWED` | HTTP method not allowed |
| `COMPLIANCE_REJECTED` | Request rejected by compliance engine |
| `GENERATION_FAILED` | Contract generation failed |
| `RENDER_FAILED` | Document rendering failed |
| `RATE_LIMITED` | Rate limit exceeded |
| `CIRCUIT_OPEN` | Circuit breaker is open |