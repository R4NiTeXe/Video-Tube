FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production --ignore-scripts && \
    npm rebuild bcrypt --build-from-source 2>/dev/null; \
    cp -r node_modules /tmp/node_modules

FROM node:20-alpine AS runner

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

WORKDIR /app

COPY --from=builder /tmp/node_modules ./node_modules

COPY . .

RUN mkdir -p public/temp /var/log/app && \
    chown -R appuser:nodejs /app /var/log/app

USER appuser

EXPOSE 8000

ENV NODE_ENV=production \
    PORT=8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://localhost:8000/health/live').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "src/index.js"]
