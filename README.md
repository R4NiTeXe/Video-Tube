# VideoTube — Full-Stack Video Platform

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5.x-black)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%2FLocal-brightgreen)](https://mongodb.com)
[![Redis](https://img.shields.io/badge/Redis-7.x-red)](https://redis.io)
[![Jest](https://img.shields.io/badge/Tests-Jest-blue)](https://jestjs.io)
[![Sentry](https://img.shields.io/badge/Error%20Tracking-Sentry-orange)](https://sentry.io)
[![License](https://img.shields.io/badge/License-ISC-blue)](LICENSE)

A production-ready, scalable video-sharing platform built with modern Node.js stack. Features include video upload/transcoding, real-time notifications, community posts, subscriptions, live streaming, and comprehensive admin dashboard.

---

## 🚀 Features

### Core Video Platform
- **Video Upload & Transcoding** — HLS adaptive bitrate streaming via Cloudinary
- **Video Management** — CRUD, chapters, scheduling, visibility controls
- **Watch History & Later** — Persistent watch history (capped at 500), watch later list (capped at 200)
- **Trending Algorithm** — Pre-computed trending scores updated hourly via cron

### Social & Community
- **Subscriptions** — Subscribe/unsubscribe, notifications on new uploads
- **Community Posts** — Text/image/poll posts with likes and comments
- **Comments & Replies** — Threaded comments with like/unlike
- **Likes** — Atomic like/unlike on videos, comments, and posts (race-condition safe)

### Real-Time
- **Server-Sent Events (SSE)** — Live notification feed with automatic reconnection
- **WebSocket** — Bidirectional channel for live comments, typing indicators
- **Session Management** — Multi-device sessions with "this device" badge, revoke all

### Authentication & Security
- **Multi-Flow Auth** — Standard email/password + OTP (email/WhatsApp) registration & login
- **Password Reset** — Token-based + OTP-based flows
- **JWT Blacklist** — Access tokens invalidated on logout via Redis
- **Email Verification Enforced** — Unverified emails cannot log in
- **Rate Limiting** — Tiered limiters (auth, OTP, search, upload, view)
- **Content Moderation** — Leet-speak normalized banned word detection
- **CORS Hardening** — Production requires explicit `CORS_ORIGIN`

### Admin & Analytics
- **Admin Dashboard** — User management, banning, role changes, content moderation
- **Channel Analytics** — Views, likes, comments, subscriber growth, views over time
- **Platform Stats** — Total users, videos, comments, subscriptions
- **Reports & Moderation** — User reports with status workflow

### Infrastructure
- **Redis Caching** — Video metadata (2min), channel profiles (1min), session storage
- **Distributed Locking** — Redis SET NX EX for multi-instance safety
- **Prometheus Metrics** — `/metrics` endpoint with request duration, rate, DB query latency, active connections
- **Sentry Integration** — Conditional error tracking (opt-in via `SENTRY_DSN`)
- **Cron Jobs** — Scheduled video publishing (every minute), trending score recalc (hourly)
- **Cloudinary Webhook** — Transcoding completion callback
- **Database Backup** — `npm run backup` (mongodump + gzip)
- **Graceful Shutdown** — SIGTERM/SIGINT handlers, connection draining

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 18+ (ES Modules) |
| Framework | Express 5 |
| Database | MongoDB + Mongoose 9 |
| Cache/Queue | Redis 7 (ioredis) + BullMQ |
| Media | Cloudinary (HLS, adaptive bitrate) |
| Auth | JWT (access + refresh), bcrypt, OTP |
| Real-time | SSE (EventSource) + WebSocket (ws) |
| Testing | Jest + Supertest + MongoDB Memory Server |
| Monitoring | Prometheus (prom-client) + Sentry |
| Docs | Swagger UI |
| CI/CD Ready | Node-cron, graceful shutdown |

---

## 📦 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Redis 7+ (local or managed)
- Cloudinary account

### Installation

```bash
# Clone and install
git clone <repo-url>
cd VideoTube/Backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start development server
npm run dev
```

### Environment Variables

```env
# Server
PORT=8000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net

# JWT
ACCESS_TOKEN_SECRET=your-64-char-hex
REFRESH_TOKEN_SECRET=your-64-char-hex
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=10d

# Redis
REDIS_URL=redis://localhost:6379

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

# Frontend/Backend URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:3000

# Email (Brevo SMTP + Resend fallback)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-pass
RESEND_API_KEY=re_xxxxx
MAIL_FROM=VideoTube <noreply@videotube.com>

# OAuth (optional)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
FACEBOOK_APP_ID=xxx
FACEBOOK_APP_SECRET=xxx
DISCORD_CLIENT_ID=xxx
DISCORD_CLIENT_SECRET=xxx

# WhatsApp (optional)
WHATSAPP_API_URL=https://graph.facebook.com/v17.0
WHATSAPP_PHONE_NUMBER_ID=xxx
WHATSAPP_ACCESS_TOKEN=xxx

# Monitoring (optional)
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_TRACES_SAMPLE_RATE=0.1
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Structure

```
tests/
├── testUtils.js          # Shared helpers (in-memory MongoDB, auth helpers)
├── auth.test.js          # Register, login, lockout, token refresh
├── video.test.js         # View count, upload, CRUD
├── like.test.js          # Race condition tests (concurrent likes)
├── subscription.test.js  # Toggle, notifications
├── dashboard.test.js     # Stats, analytics
├── distributedLock.test.js # Redis lock tests
└── metrics.test.js       # Prometheus metrics
```

### Writing New Tests

```javascript
import { describe, it, beforeAll, afterAll, beforeEach, expect } from "@jest/globals";
import { startTestServer, stopTestServer, clearDatabase, createTestUser, loginTestUser } from "./testUtils.js";

describe("My Feature", () => {
  beforeAll(async () => { await startTestServer(); });
  afterAll(async () => { await stopTestServer(); });
  beforeEach(async () => { await clearDatabase(); });

  it("should do something", async () => {
    const user = await createTestUser({ username: "tester" });
    const { cookies } = await loginTestUser({ email: "tester@example.com" });
    // ... test logic
  });
});
```

---

## 📊 API Documentation

Interactive Swagger UI available at `/api-docs` (dev only).

### Key Endpoints

| Category | Endpoint | Auth | Description |
|----------|----------|------|-------------|
| **Auth** | `POST /api/v1/users/register` | ❌ | Register |
| | `POST /api/v1/users/login` | ❌ | Login |
| | `POST /api/v1/users/logout` | ✅ | Logout (blacklists token) |
| | `POST /api/v1/users/refresh-token` | ✅ | Refresh access token |
| | `POST /api/v1/users/send-registration-otp` | ❌ | Send OTP |
| | `POST /api/v1/users/verify-registration-otp` | ❌ | Verify OTP + register |
| **Videos** | `GET /api/v1/videos` | ❌ | List videos (paginated, filterable) |
| | `GET /api/v1/videos/:id` | ❌ | Get video (increments view) |
| | `POST /api/v1/videos` | ✅ | Upload video |
| | `PATCH /api/v1/videos/:id` | ✅ | Update video |
| | `DELETE /api/v1/videos/:id` | ✅ | Delete video |
| **Likes** | `POST /api/v1/likes/toggle/video/:id` | ✅ | Like/unlike video |
| | `POST /api/v1/likes/toggle/comment/:id` | ✅ | Like/unlike comment |
| **Subscriptions** | `POST /api/v1/subscriptions/c/:channelId` | ✅ | Subscribe/unsubscribe |
| | `GET /api/v1/subscriptions/u/:userId` | ✅ | User's subscriptions |
| **Community** | `GET /api/v1/community/posts` | ❌ | List posts |
| | `POST /api/v1/community/posts` | ✅ | Create post |
| | `POST /api/v1/community/posts/:id/like` | ✅ | Like post |
| **Dashboard** | `GET /api/v1/dashboard/stats` | ✅ | Channel stats |
| | `GET /api/v1/dashboard/videos` | ✅ | Paginated videos with analytics |
| | `GET /api/v1/dashboard/analytics` | ✅ | Views over time |
| **Admin** | `GET /api/v1/admin/users` | Admin | List users (paginated) |
| | `POST /api/v1/admin/users/:id/ban` | Admin | Ban + delete user |
| | `POST /api/v1/admin/users/:id/role` | Admin | Change role |
| **Health/Metrics** | `GET /health/live` | ❌ | Liveness probe |
| | `GET /health/ready` | ❌ | Readiness probe (DB + Cloudinary) |
| | `GET /metrics` | ❌ | Prometheus metrics |
| **Real-time** | `GET /api/v1/sse/stream` | ✅ | SSE notifications |
| | `WS /ws` | ✅ | WebSocket (token query param) |

---

## 🏗 Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  Express 5  │────▶│  MongoDB    │
│  (React)    │     │   API       │     │  (Mongoose) │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌─────────┐ ┌──────────┐ ┌───────────┐
         │  Redis  │ │ Cloudinary│ │  BullMQ   │
         │ (Cache, │ │ (Media,   │ │ (Jobs,    │
         │  Locks,  │ │  HLS,     │ │  Workers) │
         │  Blacklist)│  Webhook)  │             │
         └─────────┘ └──────────┘ └───────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌─────────┐ ┌──────────┐ ┌───────────┐
         │  SSE    │ │ WebSocket│ │  Cron     │
         │  Stream │ │  (ws)    │ │ (node-    │
         │         │ │          │ │  cron)    │
         └─────────┘ └──────────┘ └───────────┘
```

### Data Models

- **User** — Profile, auth, subscriptions, watch history/later, sessions
- **Video** — Metadata, HLS/qualities, chapters, scheduled publishing, trendingScore
- **Subscription** — Subscriber → Channel (unique compound index)
- **Like** — Polymorphic (video/comment/post) with atomic toggle
- **Comment** — Threaded (parentComment), paginated
- **CommunityPost** — Text/image/poll, likes, comments
- **Playlist** — Ordered video collections
- **Notification** — Typed (like, comment, subscription, mention), SSE delivery
- **Session** — Device, IP, location (GeoIP), lastActiveAt
- **Report** — User/content reports with status workflow

---

## 🚀 Production Deployment

### Docker (Recommended)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8000
CMD ["node", "src/index.js"]
```

```bash
docker build -t videotube .
docker run -d \
  --name videotube \
  -p 8000:8000 \
  --env-file .env.production \
  --restart unless-stopped \
  videotube
```

### Health Checks

```yaml
# Kubernetes example
livenessProbe:
  httpGet:
    path: /health/live
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 30
readinessProbe:
  httpGet:
    path: /health/ready
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 10
```

### Scaling Considerations

- **Redis** — Use Redis Cluster or managed (ElastiCache, Azure Cache)
- **MongoDB** — Replica set + sharding for write-heavy workloads
- **Multiple Instances** — Distributed locks (`acquireLock`) protect critical sections
- **Sessions** — Stored in MongoDB, no sticky sessions needed
- **Rate Limiting** — Stored in Redis, shared across instances
- **Background Jobs** — BullMQ workers can scale horizontally

---

## 📁 Project Structure

```
Backend/
├── src/
│   ├── config/           # Passport, Swagger
│   ├── controllers/      # Route handlers (video, user, admin, etc.)
│   ├── middlewares/      # Auth, rate limiting, CSRF, validation
│   ├── models/           # Mongoose schemas
│   ├── queues/           # BullMQ job queues
│   ├── routes/           # Express routers
│   ├── services/         # Business logic (OTP, email)
│   ├── utils/            # Redis, Cloudinary, logger, metrics, websocket
│   ├── validators/       # Zod schemas
│   ├── app.js            # Express setup, middleware chain
│   └── index.js          # Entrypoint, cron, graceful shutdown
├── scripts/
│   └── backup.cjs        # mongodump backup
├── tests/                # Jest + Supertest
├── .vscode/
│   └── launch.json       # Debug configs
└── package.json
```

---

## 🔒 Security

| Threat | Mitigation |
|--------|------------|
| **NoSQL Injection** | Mongoose schema validation, `$`-key sanitization middleware |
| **XSS** | Helmet CSP, output encoding, no innerHTML in API |
| **CSRF** | `csurf` middleware + `SameSite=Lax` cookies |
| **Token Theft** | JWT blacklist on logout, short access expiry (1d) |
| **Brute Force** | Account lockout (5 attempts → 15min), rate limiting |
| **Email Enumeration** | Constant-time forgot-password responses |
| **Prototype Pollution** | `express.json({ depth: 10 })`, `parameterLimit: 1000` |
| **Clickjacking** | Helmet `frameguard: deny` |
| **MIME Sniffing** | Helmet `nosniff` |
| **HSTS** | Helmet `strictTransportSecurity` (1yr, preload) |
| **CORS** | Whitelist origins, credentials enabled |
| **Secrets** | Startup validation, no defaults in prod |

### Secret Management

```bash
# Generate secure secrets
ACCESS_TOKEN_SECRET=$(openssl rand -hex 32)
REFRESH_TOKEN_SECRET=$(openssl rand -hex 32)
```

### Production Checklist

- [ ] `NODE_ENV=production`
- [ ] `SENTRY_DSN` configured
- [ ] `CORS_ORIGIN` set to frontend domain (no fallback)
- [ ] `FRONTEND_URL`, `BACKEND_URL` set
- [ ] MongoDB Atlas with IP whitelist
- [ ] Redis TLS enabled
- [ ] Cloudinary signed uploads
- [ ] SMTP credentials rotated
- [ ] Backup script scheduled (cron)
- [ ] Log aggregation (Datadog/ELK)
- [ ] Alerting on error rate > 1%

---

## 📈 Monitoring & Observability

### Prometheus Metrics (`/metrics`)

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `videotube_http_requests_total` | Counter | method, route, status | Request count |
| `videotube_http_request_duration_seconds` | Histogram | method, route, status | Latency |
| `videotube_active_connections` | Gauge | — | Active HTTP connections |
| `videotube_db_query_duration_seconds` | Histogram | operation, collection | DB latency |
| `videotube_cache_hits_total` | Counter | hit/miss | Cache effectiveness |
| `videotube_rate_limit_rejected_total` | Counter | limiter | 429 responses |

### Sentry Integration

- Conditional init: only if `SENTRY_DSN` set
- Request handler (before routes)
- Error handler (after routes, before custom error handler)
- Breadcrumbs: 50, tracesSampleRate: 0.1 (configurable)

### Logging

- Custom logger with correlation IDs
- Levels: error, warn, info, debug
- Structured JSON in production, pretty in dev
- Correlation ID from `x-correlation-id` header or generated

### Health Checks

| Endpoint | Checks | Use Case |
|----------|--------|----------|
| `GET /health/live` | Process alive | K8s livenessProbe |
| `GET /health/ready` | MongoDB ping + Cloudinary ping + memory | K8s readinessProbe |

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for new functionality
4. Ensure all tests pass (`npm test`)
5. Run linter (`npm run lint` if configured)
6. Commit changes (`git commit -m 'Add amazing feature'`)
7. Push to branch (`git push origin feature/amazing-feature`)
8. Open Pull Request

---

## 📄 License

ISC License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com)
- [Mongoose](https://mongoosejs.com)
- [Cloudinary](https://cloudinary.com)
- [Redis](https://redis.io)
- [Jest](https://jestjs.io)
- [Prometheus](https://prometheus.io)
- [Sentry](https://sentry.io)

---

**Built with ❤️ by the VideoTube team**