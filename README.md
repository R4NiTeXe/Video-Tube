# VideoTube — Enterprise-Grade Video Platform

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%2FLocal-47A248?logo=mongodb&logoColor=white)](https://mongodb.com)
[![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![Next.js](https://img.shields.io/badge/Next.js-14.x-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![Jest](https://img.shields.io/badge/Tests-Jest-C21325?logo=jest&logoColor=white)](https://jestjs.io)
[![Sentry](https://img.shields.io/badge/Observability-Sentry-362D59?logo=sentry&logoColor=white)](https://sentry.io)
[![License](https://img.shields.io/badge/License-ISC-blue)](LICENSE)

A production-ready, highly scalable video-sharing platform built with a modern TypeScript/Node.js stack. Engineered for high availability, the platform features adaptive bitrate video streaming, real-time telemetry, comprehensive security hardening, and a heavily optimized caching layer.

---

## ✦ System Architecture

The application follows a decoupled, service-oriented architecture, utilizing Redis for high-throughput locking and session management, and MongoDB for persistent state.

```mermaid
graph TD
    %% Define Client Layer
    subgraph Client Layer
        Web[Next.js Client]
        Mobile[Mobile API Client]
    end

    %% Define Load Balancing / Proxy
    Proxy[Reverse Proxy / WAF]

    %% Define Application Layer
    subgraph Application Tier [Express.js Application]
        Auth[Unified Auth Controller]
        Media[Media Controller]
        Social[Social Graph Controller]
        Jobs[Cron / Background Jobs]
    end

    %% Define Infrastructure Services
    subgraph Infrastructure Tier
        Mongo[(MongoDB)]
        RedisCache[(Redis Cache)]
        RedisLock[(Redis Distributed Locks)]
        Cloudinary[(Cloudinary CDN)]
    end

    %% Connections
    Web --> Proxy
    Mobile --> Proxy
    Proxy --> Auth
    Proxy --> Media
    Proxy --> Social

    Auth --> Mongo
    Auth --> RedisCache
    Media --> Mongo
    Media --> Cloudinary
    Media --> RedisLock
    Social --> Mongo
    Social --> RedisCache
    Jobs --> Mongo

    %% Styling
    classDef primary fill:#1f2937,stroke:#3b82f6,stroke-width:2px,color:#ffffff;
    classDef secondary fill:#374151,stroke:#9ca3af,stroke-width:1px,color:#ffffff;
    
    class Web,Mobile,Proxy,Auth,Media,Social,Jobs primary;
    class Mongo,RedisCache,RedisLock,Cloudinary secondary;
```

### Video Upload Pipeline

To ensure the Node.js event loop is never blocked, heavy video transcoding is offloaded entirely.

```mermaid
sequenceDiagram
    participant Client
    participant API as Express API
    participant CDN as Cloudinary
    participant DB as MongoDB

    Client->>API: POST /api/v1/videos
    API->>CDN: Stream raw video buffer
    CDN-->>API: Return Processing Asset ID
    API->>DB: Save Document (Status: Uploading)
    API-->>Client: 201 Created (Video Pending)

    Note right of CDN: Async HLS Transcoding...

    CDN->>API: POST /webhooks/cloudinary
    API->>DB: Update Video to Published
```

---

## ✦ Core Features & Subsystems

### Media & Streaming
* **Adaptive Bitrate Streaming** — HLS transcoding via Cloudinary for optimized playback.
* **Video Lifecycle** — Full CRUD, timestamp chapters, scheduled publishing, and visibility constraints.
* **Algorithmic Discovery** — Pre-computed trending scores updated asynchronously via cron.
* **Persistent Watch History** — Read-optimized, capped watch history leveraging DB triggers.

### Social Graph & Interactivity
* **Subscription Engine** — Granular subscription tracking with real-time SSE fan-out notifications.
* **Atomic Interactions** — Like/unlike mutations utilize database-level atomicity to prevent race conditions.
* **Threaded Discussions** — Hierarchical comment trees optimized with cursor-based pagination.

### Enterprise Security
* **Multi-Flow Authentication** — Standard credentials alongside OTP (Email/WhatsApp) pathways.
* **JWT Lifecycle** — Secure, HTTP-only cookies with short-lived access tokens and Redis-backed revocation.
* **Automated Moderation** — RegEx-optimized banned word detection running at module initialization.
* **MIME Validation** — Strict magic-byte inspection for all binary uploads to prevent payload disguise.

---

## ✦ Technical Stack Specifications

| Layer | Technology | Configuration & Details |
|-------|------------|-------------------------|
| **Runtime Engine** | Node.js 18+ | ES Modules, `--experimental-specifier-resolution=node` |
| **HTTP Framework** | Express 5 | Native Promise rejection handling |
| **Database Tier** | MongoDB 7+ | Mongoose 9 ODM, Strict schema casting |
| **Caching & Mutex**| Redis 7 | ioredis client, `SET NX EX` distributed locking |
| **Media Pipeline** | Cloudinary | Auto-format, auto-quality, Webhook integrations |
| **Authentication** | JWT | Access (1d) + Refresh (10d), Bcrypt (rounds: 10) |
| **Real-time Comms**| SSE + WebSockets | Server-Sent Events for notifications, `ws` for chat |
| **Observability** | Prometheus + Sentry | `prom-client` integration, global uncaught exception hooks |

---

## ✦ Comprehensive API Reference

Interactive Swagger documentation is auto-generated and available at `/api-docs` (development only).

| Category | Endpoint | Authentication | Description |
|----------|----------|----------------|-------------|
| **Auth** | `POST /api/v1/users/register` | Public | Register standard account |
| | `POST /api/v1/users/login` | Public | Authenticate and issue JWTs |
| | `POST /api/v1/users/logout` | Required | Revoke sessions and blacklist tokens |
| | `POST /api/v1/users/refresh-token` | Required | Rotate access and refresh tokens |
| | `POST /api/v1/users/send-registration-otp`| Public | Dispatch OTP for passwordless registration |
| | `POST /api/v1/users/verify-registration-otp`| Public | Validate OTP and provision account |
| **Media**| `GET /api/v1/videos` | Public | Paginated, filterable video index |
| | `GET /api/v1/videos/:id` | Public | Retrieve video metadata (increments views) |
| | `POST /api/v1/videos` | Required | Upload binary payload for processing |
| | `PATCH /api/v1/videos/:id` | Required | Mutate video metadata |
| | `DELETE /api/v1/videos/:id` | Required | Purge video and associated assets |
| **Social**| `POST /api/v1/likes/toggle/video/:id` | Required | Atomic like/unlike mutation |
| | `POST /api/v1/subscriptions/c/:channelId` | Required | Subscribe or unsubscribe from channel |
| | `GET /api/v1/community/posts` | Public | Fetch paginated community feed |
| **Admin**| `GET /api/v1/admin/users` | Admin Only | Paginated user index |
| | `POST /api/v1/admin/users/:id/ban` | Admin Only | Terminate user access and purge content |
| **Health**| `GET /health/ready` | Public | Kubernetes readiness probe (DB + CDN check) |
| | `GET /metrics` | Restricted | Prometheus metrics scraping |
| **Stream**| `GET /api/v1/sse/stream` | Required | Establish Server-Sent Events connection |

---

## ✦ Observability & Telemetry

### Prometheus Integration (`/metrics`)

| Metric Designation | Type | Dimensions (Labels) | Purpose |
|--------------------|------|---------------------|---------|
| `videotube_http_requests_total` | Counter | `method`, `route`, `status` | Overall API throughput |
| `videotube_http_request_duration_seconds` | Histogram | `method`, `route`, `status` | Request latency distribution |
| `videotube_active_connections` | Gauge | — | Track Node.js socket saturation |
| `videotube_db_query_duration_seconds` | Histogram | `operation`, `collection` | Database latency tracking |
| `videotube_cache_hits_total` | Counter | `hit`, `miss` | Redis cache efficiency ratios |
| `videotube_rate_limit_rejected_total` | Counter | `limiter_type` | Track abusive IP throttling |

---

## ✦ Security Hardening & Threat Mitigation

| Threat Vector | Mitigation Strategy Implemented |
|---------------|---------------------------------|
| **NoSQL Injection** | Strict Mongoose casting + custom middleware stripping `$` and `__` prefixed keys. |
| **XSS** | Helmet.js integration enforcing strict Content Security Policies (CSP). |
| **CSRF** | Double Submit Cookie pattern implemented via `csurf` + `SameSite=Lax`. |
| **Token Theft** | Immediate JWT blacklisting on logout via Redis. Access tokens expire in 1 day. |
| **Brute Force** | Account lockout mechanism (5 failed attempts triggers 15-minute lock). |
| **User Enumeration**| Constant-time responses for authentication and forgot-password flows. |
| **MIME Sniffing** | Enforced Helmet `nosniff` headers and binary payload magic-byte inspection. |
| **MitM Attacks** | HSTS preload directives enforced for 1 year. |

---

## ✦ Local Development Setup

### Bootstrapping Instructions

```bash
# Clone the repository
git clone <repo-url>
cd VideoTube/Backend

# Install dependencies
npm ci

# Configure environment state
cp .env.example .env
# Populate .env with MongoDB, Redis, and Cloudinary credentials

# Execute development server
npm run dev
```

### Environment Variable Requirements

```env
# Infrastructure & Networking
PORT=8000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# Persistence & Data Storage
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net
REDIS_URL=redis://localhost:6379

# Cryptography & Sessions
ACCESS_TOKEN_SECRET=your-64-char-hex
REFRESH_TOKEN_SECRET=your-64-char-hex
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=10d

# Media Asset Delivery (CDN)
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

# Email Dispatch
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-pass
```

---

## ✦ Project Directory Structure

```text
Backend/
├── src/
│   ├── config/           # Infrastructure configurations (Passport, Swagger)
│   ├── controllers/      # Request handlers (Media, Auth, Admin, etc.)
│   ├── middlewares/      # Interceptors (Rate Limiting, CSRF, Validation, Multer)
│   ├── models/           # Mongoose ODM schemas (User, Video, OTP, Session)
│   ├── queues/           # BullMQ job queue definitions and processors
│   ├── routes/           # Express router definitions (API v1)
│   ├── services/         # Core business logic (OTP generation, Email delivery)
│   ├── utils/            # Shared utilities (Redis, Cloudinary, Logger)
│   ├── validators/       # Zod schema definitions for payload validation
│   ├── app.js            # Express application setup, global middleware pipeline
│   └── index.js          # Main entrypoint, DB connection, cron init, shutdown
├── tests/                # Jest integration and unit tests
├── .env.example          # Environment variable template
├── .dockerignore         # Docker context exclusion rules (blocks .env)
├── package.json          # Dependency and script definitions
└── Dockerfile            # Container build instructions
```

---

## ✦ Testing & Quality Assurance

The platform implements a rigorous testing strategy utilizing Jest, Supertest, and a mocked in-memory MongoDB server to ensure data integrity during execution.

```bash
# Execute standard integration suite
npm test

# Generate Istanbul coverage metrics
npm run test:coverage
```

### Test Architecture Overview

```text
tests/
├── testUtils.js          # Centralized helpers (MongoDB Memory Server, Auth mocks)
├── auth.test.js          # Registration, lockout policies, token rotation
├── video.test.js         # View incrementation, CRUD pipelines
├── like.test.js          # Concurrency and race condition validations
├── subscription.test.js  # Fan-out logic and toggle integrity
└── dashboard.test.js     # Analytics aggregation logic
```

---

## ✦ Production Deployment (Docker)

The provided Dockerfile utilizes a highly optimized, multi-stage build pattern.

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 8000
CMD ["node", "src/index.js"]
```

**Execution:**
```bash
docker build -t videotube-api .
docker run -d \
  --name videotube-api \
  -p 8000:8000 \
  --env-file .env.production \
  --restart unless-stopped \
  videotube-api
```

---

**Architecture and Implementation by Ranit.**