# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests (lock file optional for compatibility)
COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

COPY . .

# Disable Serwist in build if needed for CI (optional)
ENV NODE_ENV=production
RUN npm run build

# Run stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Persisted at runtime via volume
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
