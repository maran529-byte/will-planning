# T5: Membership and Payment System

会员与付费系统微服务

## Features

- 会员管理 (Membership Management)
- 订阅计划 (Subscription Plans)
- 支付集成 (Payment Integration with Stripe)
- 订单管理 (Order Management)

## Project Structure

```
t5-membership/
├── cmd/server/          # Application entrypoint
├── internal/
│   ├── config/          # Configuration
│   ├── handler/         # HTTP handlers
│   ├── middleware/      # Auth & logging middleware
│   ├── model/           # Data models
│   ├── repository/     # Database repositories
│   └── service/         # Business logic
├── api/v1/              # API specifications
├── pkg/payment/         # Payment providers
└── go.mod
```

## API Endpoints

### Membership
- `POST /api/v1/membership` - Create membership
- `GET /api/v1/membership` - Get membership
- `GET /api/v1/membership/active` - Get active membership
- `DELETE /api/v1/membership` - Cancel membership
- `POST /api/v1/membership/renew` - Renew membership

### Plans
- `GET /api/v1/plans` - List all plans
- `GET /api/v1/plans/:id` - Get plan details

### Orders
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders` - List user orders
- `GET /api/v1/orders/:id` - Get order details

### Webhooks
- `POST /webhook/stripe` - Stripe webhook handler

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| SERVER_PORT | Server port | 8085 |
| DATABASE_DSN | MySQL connection string | - |
| JWT_SECRET | JWT secret key | - |
| STRIPE_KEY | Stripe API key | - |
| ENVIRONMENT | dev/production | development |