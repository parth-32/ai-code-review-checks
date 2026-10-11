# ShopFlow API

Enterprise-grade E-Commerce Backend Service built with Node.js, Express, and TypeScript.

## Architecture Overview

- **Layered Architecture**: Decoupled Controllers, Services, and Repositories.
- **Strong Typing & Validation**: Strict TypeScript types with runtime Zod schema validation.
- **Resilient Error Handling**: Centralized error middleware with standardized RFC 7807 problem responses.
- **Security Best Practices**: Helmet headers, CORS policies, JWT-based stateless auth, and bcrypt password hashing.

## Directory Structure

```text
src/
├── app.ts                 # Express application configuration & middleware
├── index.ts               # HTTP server bootstrap & graceful shutdown hooks
├── config/                # Environment variables & runtime settings
├── middleware/            # Auth guard, request validation, error handler
├── modules/
│   ├── auth/              # Authentication controller, service, token utilities
│   ├── users/             # User management and profiles
│   ├── products/          # Catalog & inventory management
│   ├── orders/            # Order processing and state machine
│   └── discounts/         # Promotions, vouchers, and discount rules
├── utils/                 # Structured logger, math & financial helpers
└── types/                 # Domain models and shared interfaces
```

## Getting Started

### Prerequisites
- Node.js >= 18
- npm >= 9

### Installation
```bash
npm install
```

### Environment Setup
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

### Development
```bash
npm run dev
```

### Build & Run
```bash
npm run build
npm start
```

### Testing
```bash
npm test
```
