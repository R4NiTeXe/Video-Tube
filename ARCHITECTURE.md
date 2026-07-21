# VideoTube — Architecture & System Design Document

## 1. Executive Summary

VideoTube is a production-grade video-sharing platform built as a monolithic Node.js/Express API with a React frontend. The system is designed for horizontal scalability, strong consistency, and operational simplicity while maintaining the ability to extract services later.

**Key Architectural Decisions:**
- **Monolith-first** — Single deployable unit with clear module boundaries
- **Database-per-service not needed** — MongoDB handles all relational + document needs
- **Redis as Swiss Army Knife** — Cache, distributed lock, rate limit store, session store, BullMQ backend
- **Event-driven where it matters** — SSE for notifications, WebSocket for live features, BullMQ for async work

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Web App   │  │  Mobile App │  │  Third-party│  │   Admin UI  │         │
│  │  (React)    │  │  (React     │  │  Integrations│  │  (React)    │         │
│  │             │  │   Native)   │  │             │  │             │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
└─────────│────────────────│────────────────│────────────────│─────────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY (Express 5)                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  Rate Limiting  │  CSRF  │  Helmet  │  CORS  │  Body Parser  │  Cookie │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  Correlation ID  │  Request Timing  │  Metrics Collection  │  Sentry   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AUTH MODULE   │    │  BUSINESS MODULE│    │  REAL-TIME MOD  │
│                 │    │                 │    │                 │
│ • JWT (access)  │    │ • Video CRUD    │    │ • SSE Stream    │
│ • Refresh token │    │ • Likes/Subs    │    │ • WebSocket     │
│ • OTP flows     │    │ • Comments      │    │ • Typing ind.   │
│ • Session mgmt  │    │ • Playlists     │    │ • Live comments │
│ • Blacklist     │    │ • Community     │    │                 │
│ • Rate limits   │    │ • Reports       │    │ • Presence      │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  MongoDB    │  │   Redis     │  │ Cloudinary  │  │  BullMQ     │         │
│  │  (Primary)  │  │ (Cache/Lock/│  │  (Media)    │  │  (Queue)    │         │
│  │             │  │  Queue/Rate)│  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Module Architecture

### 3.1 Authentication Module (`src/controllers/user.controller.js`, `src/middlewares/auth.middleware.js`)

**Responsibilities:**
- Credential validation (email/password + OTP)
- JWT generation (access + refresh)
- Token blacklisting on logout
- Session creation & device tracking
- Account lockout after failed attempts

**Key Flows:**
```
Registration:
  Standard: email/password → create user → send verification email
  Unified OTP: send OTP → verify OTP → create user (email verified)

Login:
  Credentials → validate → check lockout → generate tokens → create session

Logout:
  Access token → Redis blacklist (TTL = access token expiry)
  Refresh token → DB unset + session deactivate
  Clear cookies

Token Refresh:
  Refresh token → validate → rotate → new access + refresh → update session
```

**Security Controls:**
- Access token: 1 day, HttpOnly Secure SameSite=Lax cookie
- Refresh token: 10 days, HttpOnly Secure SameSite=Strict cookie + hashed in DB
- Blacklist check on every `verifyJWT` call
- 5 failed attempts → 15min lockout
- Constant-time email enumeration prevention

### 3.2 Video Module (`src/controllers/video.controller.js`)

**Responsibilities:**
- Upload & transcoding orchestration
- HLS adaptive bitrate streaming
- View counting (race-condition safe)
- Scheduled publishing
- Trending score computation

**Upload Pipeline:**
```
POST /videos (multipart)
    │
    ├─ Cloudinary upload (video + thumbnail)
    │
    ├─ Save Video document (status=pending)
    │
    ├─ Return 201 to client immediately
    │
    └─ Background: BullMQ "video-processing" job
           │
           ├─ generateHlsManifest() → Cloudinary eager transform
           ├─ generateVideoQualities() → 144p→1080p URLs
           └─ Update Video: transcodingStatus=completed, hlsUrl, qualities
```

**View Counting (Race-Condition Safe):**
```javascript
// In getVideoById
const oldUser = await User.findByIdAndUpdate(userId,
  { $addToSet: { watchHistory: videoId } },
  { new: false, projection: { watchHistory: 1 } }
);

if (!oldUser.watchHistory.includes(videoId)) {
  await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
}

// Cap watchHistory at 500
await User.findByIdAndUpdate(userId,
  { $push: { watchHistory: { $each: [], $slice: -500 } } }
);
```

**Trending Algorithm:**
- Pre-computed hourly via cron: `runUpdateTrendingScores`
- Formula: `views * 0.4 + likesCount * 3 - ageInDays * 0.1 * 100`
- Stored in `trendingScore` field, indexed for fast sort

### 3.3 Social Module (Likes, Subscriptions, Comments)

**Likes — Atomic Toggle:**
```javascript
// Video like
const deleted = await Like.findOneAndDelete({ video, likedBy: userId });
if (deleted) {
  await Video.findByIdAndUpdate(videoId, { $inc: { likesCount: -1 } });
} else {
  await Like.create({ video, likedBy: userId });
  await Video.findByIdAndUpdate(videoId, { $inc: { likesCount: 1 } });
}
```

**Subscriptions:**
- Unique compound index: `{ subscriber: 1, channel: 1 }`
- Notification created on subscribe (type: "subscription")

**Comments:**
- Threaded via `parentComment` reference
- Paginated with `$facet` aggregation

### 3.4 Community Module (`src/controllers/communityPost.controller.js`)

- Posts: text, image, or poll (options with vote counts)
- Likes: atomic toggle like videos
- Comments: threaded, paginated
- Feed: user's subscribed channels + own posts

### 3.5 Real-Time Module

**SSE (`src/routes/sse.routes.js`, `src/controllers/sse.controller.js`):**
- Endpoint: `GET /api/v1/sse/stream`
- Auth: `Authorization: Bearer <accessToken>`
- Events: `notification`, `heartbeat`
- Reconnection: native `EventSource` auto-reconnect
- Server: in-memory connection map, 5-min zombie cleanup
- Payload: `{ type: "new_video|new_comment|like|subscription", ...data }`

**WebSocket (`src/utils/websocket.js`):**
- Endpoint: `ws://host/ws?token=<accessToken>`
- Protocol: JSON messages
- Rooms: `video:{videoId}` per video page
- Events: `join:video`, `leave:video`, `comment:new`, `typing:start/stop`
- Broadcast excludes sender for typing indicators

### 3.6 Admin Module (`src/controllers/admin.controller.js`)

- User listing with pagination
- Ban user (transaction: delete likes, comments, videos, subscriptions, playlists, notifications, sessions, then user)
- Role change (user/admin/moderator)
- Platform stats aggregation
- Recent activity feed

### 3.7 Background Jobs (`src/queues/videoQueue.js`)

**Queues:**
| Queue | Concurrency | Retry | Jobs |
|-------|-------------|-------|------|
| video-processing | 2 | 3 (exp backoff) | HLS + qualities |
| email | 5 | 3 | OTP, reset, notifications |
| cleanup | 1 | — | Expired OTP, old notifications |

**Cron Jobs (`src/index.js`):**
| Schedule | Job | Description |
|----------|-----|-------------|
| `* * * * *` | `runPublishScheduledVideos` | Publish videos with `scheduledAt <= now` |
| `0 * * * *` | `runUpdateTrendingScores` | Recalculate trendingScore for all published videos |

---

## 4. Data Layer

### 4.1 MongoDB Collections & Indexes

```javascript
// Video
db.videos.createIndex({ owner: 1, isPublished: 1, createdAt: -1 });
db.videos.createIndex({ isPublished: 1, scheduledAt: 1 });
db.videos.createIndex({ trendingScore: -1, isPublished: 1 });
db.videos.createIndex({ views: -1 });
db.videos.createIndex({ category: 1, isPublished: 1, createdAt: -1 });

// User
db.users.createIndex({ email: 1, username: 1 });
db.users.createIndex({ isEmailVerified: 1 });

// Notification
db.notifications.createIndex({ recipient: 1, isRead: 1, createdAt: -1 });

// Comment
db.comments.createIndex({ video: 1, parentComment: 1, createdAt: -1 });

// Like (partial unique indexes)
db.likes.createIndex(
  { video: 1, likedBy: 1 },
  { unique: true, partialFilterExpression: { video: { $exists: true } } }
);
db.likes.createIndex(
  { comment: 1, likedBy: 1 },
  { unique: true, partialFilterExpression: { comment: { $exists: true } } }
);
db.likes.createIndex(
  { post: 1, likedBy: 1 },
  { unique: true, partialFilterExpression: { post: { $exists: true } } }
);

// Subscription
db.subscriptions.createIndex({ subscriber: 1, channel: 1 }, { unique: true });
```

### 4.2 Redis Usage

| Purpose | Key Pattern | TTL | Eviction |
|---------|-------------|-----|----------|
| Video metadata cache | `video:{videoId}` | 120s | LRU |
| Channel profile cache | `channel:{username}` | 60s | LRU |
| Token blacklist | `blacklist:{accessToken}` | 86400s (1d) | TTL |
| Distributed lock | `lock:{resource}` | 10s (configurable) | TTL |
| Rate limiting | `ratelimit:{key}` | Window-based | TTL |
| BullMQ queues | `bull:{queueName}:*` | — | BullMQ managed |

### 4.3 Connection Pooling (MongoDB)

```javascript
// src/db/index.js
mongoose.connect(uri, {
  maxPoolSize: 10,
  minPoolSize: 2,
  socketTimeoutMS: 45000,
});
```

---

## 5. API Design

### 5.1 REST Conventions

| Aspect | Standard |
|--------|----------|
| Versioning | URL prefix: `/api/v1/` |
| Resources | Plural nouns: `/videos`, `/users` |
| Filtering | Query params: `?category=Education&sortBy=views` |
| Pagination | `page`, `limit` (max 50) |
| Sorting | `sortBy`, `sortType=asc|desc` |
| Errors | `{ success: false, statusCode, message, errors? }` |
| Success | `{ success: true, statusCode, data, message }` |

### 5.2 Rate Limiting Tiers

| Tier | Window | Max (Prod) | Routes |
|------|--------|------------|--------|
| API | 15 min | 100 | All `/api` |
| Auth | 15 min | 10 | Login, register, forgot-password |
| OTP | 15 min | 5 | Send/verify OTP |
| Upload | 1 hour | 20 | Video upload |
| Search | 1 min | 20 | Search endpoints |
| View | 1 min | 15 | `GET /videos/:id` |

### 5.3 Response Envelopes

```json
// Success
{
  "success": true,
  "statusCode": 200,
  "data": { "user": { ... } },
  "message": "User logged in successfully"
}

// Error
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Invalid email" }]
}
```

---

## 6. Real-Time Architecture Detail

### 6.1 SSE (Notifications)

**Connection Lifecycle:**
```
Client                                    Server
  │                                          │
  ├─ GET /api/v1/sse/stream (Bearer token)  │
  │────────────────────────────────────────▶│
  │                                          │ 200 OK, Content-Type: text/event-stream
  │◀────────────────────────────────────────│
  │                                          │
  │  event: notification                     │
  │  data: {"type":"new_video","videoId":...}│
  │◀────────────────────────────────────────│
  │                                          │
  │  (network blip)                          │
  │                                          │
  │  (auto-reconnect via EventSource)        │
  │◀────────────────────────────────────────│
  │                                          │
  │  (5 min no heartbeat)                    │
  │                                          │  cleanup: connection.end()
  │                                          │  remove from connection map
```

**Invalidation Pattern:**
```javascript
// In like.controller.js after creating notification
if (recipientConnection) {
  recipientConnection.write(`event: notification\ndata: ${JSON.stringify(payload)}\n\n`);
}
// Client: eventSource.onmessage = () => queryClient.invalidateQueries(["notifications"]);
```

### 6.2 WebSocket (Live Comments)

**Message Protocol:**
```json
// Client → Server
{ "type": "join:video", "videoId": "abc123" }
{ "type": "comment:new", "videoId": "abc123", "comment": { "content": "Great!", "videoId": "abc123" } }
{ "type": "typing:start", "videoId": "abc123", "username": "john" }
{ "type": "typing:stop", "videoId": "abc123" }

// Server → Client
{ "type": "comment:new", "comment": { "_id": "...", "content": "Great!", "owner": { "username": "jane" } } }
{ "type": "typing:start", "userId": "...", "username": "john" }
{ "type": "typing:stop", "userId": "..." }
```

**Room Management:**
- `rooms = Map<"video:abc123", Set<WebSocket>>`
- On join: add to room, send presence count
- On leave: remove from room, cleanup empty rooms
- Typing broadcasts to room excluding sender

---

## 7. Caching Strategy

### 7.1 Cache Keys & TTL

| Key | TTL | Invalidation Trigger |
|-----|-----|----------------------|
| `video:{videoId}` | 120s | Video update/delete, view increment |
| `channel:{username}` | 60s | Profile update, subscription count change |
| `trending:{category}:{page}:{limit}` | 300s | Trending cron job |

### 7.2 Cache Patterns

**Read-Through (getVideoById):**
```javascript
const cached = await cacheGet(`video:${videoId}`);
if (cached) return cached;

const video = await Video.aggregate([...]).exec();
await cacheSet(`video:${videoId}`, video, 120);
return video;
```

**Write-Through (updateVideo):**
```javascript
await Video.findByIdAndUpdate(id, updates);
await cacheDel(`video:${id}`); // or cacheSet with new data
```

**User-Specific Fields (isLiked, isSubscribed):**
- Cached data excludes user-specific fields
- Computed per-request via lightweight queries:
  ```javascript
  const [likeDoc, subDoc] = await Promise.all([
    Like.findOne({ video: videoId, likedBy: userId }).lean(),
    Subscription.findOne({ channel: ownerId, subscriber: userId }).lean()
  ]);
  videoData.isLiked = !!likeDoc;
  videoData.isSubscribed = !!subDoc;
  ```

---

## 8. Background Processing

### 8.1 BullMQ Queue Configuration

```javascript
// src/queues/videoQueue.js
const connection = { url: REDIS_URL, maxRetriesPerRequest: 3 };

export const videoQueue = new Queue("video-processing", { connection });
export const emailQueue = new Queue("email", { connection });

// Worker
const worker = new Worker("video-processing", async (job) => {
  const { videoId, publicId } = job.data;
  const [hlsUrl, qualities] = await Promise.all([
    generateHlsManifest(publicId),
    generateVideoQualities(publicId),
  ]);
  await Video.findByIdAndUpdate(videoId, {
    transcodingStatus: "completed",
    hlsUrl,
    qualities,
  });
}, { connection, concurrency: 2 });
```

### 8.2 Job Payloads

| Queue | Job Name | Payload |
|-------|----------|---------|
| video-processing | process | `{ videoId, publicId }` |
| email | send | `{ to, subject, html, provider }` |
| cleanup | expire-otp | `{ }` (runs daily) |

### 8.3 Retry & Dead Letter

- Max retries: 3 with exponential backoff
- Failed jobs → BullMQ dead letter queue (manual inspection)
- Metrics: `videotube_job_failed_total{queue,job}`

---

## 9. Security Implementation

### 9.1 Middleware Chain

```
Request
  │
  ▼
Rate Limiter (tiered)
  │
  ▼
CSRF (mutating routes)
  │
  ▼
verifyJWT
  ├─ Extract token (cookie or Bearer)
  ├─ Check Redis blacklist
  ├─ jwt.verify(accessToken)
  ├─ Load user from DB
  └─ Attach req.user
  │
  ▼
Route Handler
```

### 9.2 Token Management

| Token | Storage | Expiry | Rotation |
|-------|---------|--------|----------|
| Access | HttpOnly Cookie (Secure, Lax) | 1 day | On refresh |
| Refresh | HttpOnly Cookie (Secure, Strict) + MongoDB (bcrypt) | 10 days | On use |

**Logout:**
```javascript
// Blacklist access token for remaining lifetime
await blacklistToken(accessToken, 86400);
// Clear refresh token from DB
await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
// Deactivate session
await deactivateSession(refreshToken);
// Clear cookies
res.clearCookie("accessToken").clearCookie("refreshToken");
```

### 9.3 Rate Limiting Implementation

```javascript
// src/middlewares/rateLimiter.middleware.js
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // prod (dev same)
  standardHeaders: true,
  legacyHeaders: false,
});
```

### 9.4 Content Moderation

```javascript
// Normalizes leet speak, strips special chars
const normalizeText = (text) => {
  return text.toLowerCase()
    .split("").map(c => LEET_MAP[c] || c).join("")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ").trim();
};

// Checks all text fields
const TEXT_FIELDS = ["content", "title", "description", "name", "bio", "comment", "text"];
```

---

## 10. Monitoring & Observability

### 10.1 Prometheus Metrics (`/metrics`)

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `videotube_http_requests_total` | Counter | method, route, status | Total requests |
| `videotube_http_request_duration_seconds` | Histogram | method, route, status | Latency (buckets: .01, .05, .1, .5, 1, 2, 5) |
| `videotube_active_connections` | Gauge | — | Current HTTP connections |
| `videotube_db_query_duration_seconds` | Histogram | operation, collection | DB query latency |
| `videotube_rate_limit_rejected_total` | Counter | limiter | 429 responses |

### 10.2 Sentry Integration

```javascript
// src/app.js
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    maxBreadcrumbs: 50,
  });
  app.use(Sentry.Handlers.requestHandler());
  // ... routes ...
  app.use(Sentry.Handlers.errorHandler());
}
```

### 10.3 Logging

- Custom logger with correlation IDs
- Levels: error, warn, info, debug
- Correlation ID from `x-correlation-id` header or generated
- Structured JSON in production

### 10.4 Health Checks

| Endpoint | Checks | Probe |
|----------|--------|-------|
| `GET /health/live` | Process alive | Liveness |
| `GET /health/ready` | MongoDB ping + Cloudinary ping + memory < 512MB | Readiness |

---

## 11. Deployment Architecture

### 11.1 Container (Docker)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8000
CMD ["node", "src/index.js"]
```

### 11.2 Kubernetes (Example)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: videotube-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: videotube-api
  template:
    metadata:
      labels:
        app: videotube-api
    spec:
      containers:
      - name: api
        image: videotube:latest
        ports:
        - containerPort: 8000
        envFrom:
        - secretRef:
            name: videotube-secrets
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
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

### 11.3 Scaling Strategy

| Component | Scaling Approach |
|-----------|------------------|
| API | Horizontal (HPA on CPU > 70%, memory > 80%) |
| Redis | Cluster mode (6+ nodes) or managed (ElastiCache) |
| MongoDB | Replica set (3+), shard by `video.owner` if >100GB |
| BullMQ Workers | Horizontal (separate deployment, HPA on queue depth) |
| Cloudinary | Auto-scales (managed) |

### 11.4 Secrets Management

| Secret | Source | Rotation |
|--------|--------|----------|
| JWT secrets | K8s Secret / Vault | 90 days |
| MongoDB URI | K8s Secret / Vault | 90 days |
| Redis URL | K8s Secret | 90 days |
| Cloudinary | K8s Secret | 90 days |
| SMTP/Resend | K8s Secret | 90 days |
| OAuth secrets | K8s Secret | 90 days |

---

## 12. Testing Strategy

### 12.1 Test Structure

```
tests/
├── testUtils.js          # Shared helpers (MongoMemoryServer, auth helpers)
├── auth.test.js          # Register, login, lockout, refresh, logout
├── video.test.js         # View count, upload, CRUD
├── like.test.js          # Race condition (concurrent likes)
├── subscription.test.js  # Toggle, notifications
├── dashboard.test.js     # Stats, analytics
├── distributedLock.test.js # Redis lock tests
└── metrics.test.js       # Prometheus metrics
```

### 12.2 Test Utilities (`tests/testUtils.js`)

- `startTestServer()` — Spins up Express on random port with in-memory MongoDB
- `stopTestServer()` — Graceful shutdown
- `clearDatabase()` — Deletes all collections
- `createTestUser(overrides)` — Factory for test users
- `loginTestUser(credentials)` — Returns user + cookies
- `createTestVideo(ownerId, overrides)` — Factory for test videos
- `getAuthHeaders(cookies)` — Cookie header helper
- `expectSuccess(res, status)`, `expectError(res, status, message)`

### 12.3 Running Tests

```bash
npm test              # All tests (runInBand for isolation)
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

---

## 13. Operational Runbooks

### 13.1 Database Backup

```bash
npm run backup  # Runs scripts/backup.cjs → mongodump --gzip → backups/backup-<timestamp>/
```

### 13.2 Manual Video Reprocessing

```javascript
// In Node REPL or admin script
const { videoQueue } = await import("./src/queues/videoQueue.js");
await videoQueue.add("process", { videoId: "abc123", publicId: "xyz789" });
```

### 13.3 Trending Score Recalculation

```bash
# Manual trigger
curl -X POST http://localhost:8000/api/v1/videos/scheduled/publish \
  -H "Authorization: Bearer <admin-token>"
```

### 13.4 Redis Connection Issues

1. Check `REDIS_URL` env var
2. Verify Redis is reachable: `redis-cli ping`
3. Check logs: "Redis unavailable — caching disabled"
4. Restart API after Redis recovery (auto-reconnect on next request)

### 13.5 Rate Limit False Positives

1. Check `rateLimiter.middleware.js` limits
2. Verify `NODE_ENV=production` (dev limits were equalized)
3. Check for shared IPs (corporate NAT) → consider `X-Forwarded-For` trust proxy

---

## 14. Future Extensibility

### 14.1 Service Extraction Candidates

| Service | Trigger | Effort |
|---------|---------|--------|
| Media Processing | Video volume > 10k/day | Medium (BullMQ already separate) |
| Real-time | SSE/WebSocket connections > 10k | High (stateful) |
| Search | Elasticsearch integration | Low (new module) |
| Recommendations | ML pipeline | High |

### 14.2 Plugin Architecture

- Validators: Zod schemas in `src/validators/`
- Middleware: Add to `src/middlewares/`
- Routes: Add router in `src/routes/`, mount in `app.js`
- Models: Add in `src/models/`, export from `src/models/index.js`

---

## 15. Appendix: Key File Map

```
src/
├── app.js                    # Express setup, middleware chain, routes
├── index.js                  # Entrypoint, DB connect, cron, graceful shutdown
├── config/
│   ├── passport.js           # OAuth strategies
│   └── swagger.js            # OpenAPI spec
├── controllers/
│   ├── video.controller.js   # Video CRUD, view count, trending
│   ├── user.controller.js    # Auth, profile, sessions
│   ├── admin.controller.js   # Admin dashboard, ban, roles
│   ├── like.controller.js    # Atomic likes
│   ├── subscription.controller.js
│   ├── comment.controller.js
│   ├── communityPost.controller.js
│   ├── sse.controller.js     # Notifications
│   └── dashboard.controller.js
├── middlewares/
│   ├── auth.middleware.js    # verifyJWT + blacklist
│   ├── rateLimiter.middleware.js
│   ├── csrf.middleware.js
│   └── error.middleware.js
├── models/
│   ├── user.model.js
│   ├── video.model.js
│   ├── subscription.model.js
│   ├── like.model.js
│   ├── comment.model.js
│   ├── communityPost.model.js
│   ├── playlist.model.js
│   ├── notification.model.js
│   ├── session.model.js
│   ├── report.model.js
│   ├── otp.model.js
│   └── poll.model.js
├── queues/
│   └── videoQueue.js         # BullMQ setup
├── routes/
│   ├── video.routes.js
│   ├── user.routes.js
│   ├── admin.routes.js
│   ├── subscription.routes.js
│   ├── like.routes.js
│   ├── comment.routes.js
│   ├── communityPost.routes.js
│   ├── dashboard.routes.js
│   ├── sse.routes.js
│   ├── oauth.routes.js
│   ├── session.routes.js
│   ├── otp.routes.js
│   ├── report.routes.js
│   └── healthcheck.routes.js
├── services/
│   ├── otp.service.js
│   └── email.service.js
├── utils/
│   ├── redis.js              # Cache, blacklist, distributed lock
│   ├── cloudinary.js         # Upload, HLS, qualities, webhook
│   ├── logger.js             # Correlation ID logger
│   ├── metrics.js            # Prometheus client
│   ├── websocket.js          # WS server
│   ├── sanitizer.js          # NoSQL injection protection
│   ├── asyncHandler.js       # Error wrapper
│   ├── ApiError.js
│   └── ApiResponse.js
├── validators/
│   └── index.js              # Zod schemas
└── db/
    └── index.js              # MongoDB connection + pooling
```

---

## 16. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-17 | Ranit | Initial architecture document |