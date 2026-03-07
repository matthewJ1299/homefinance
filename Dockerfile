# ---------------------------------------------------------------------------
# Build stage
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

COPY . .

# Ensure PWA icons exist (they may not be committed; script generates into public/icons)
RUN node scripts/generate-pwa-icons.mjs

ENV NODE_ENV=production
RUN npm run build

# ---------------------------------------------------------------------------
# Run stage
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs \
 && apk add --no-cache su-exec

# Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Full node_modules (sql.js, tsx, and deps for db scripts so you can run db:seed in container)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# package.json and db scripts for running seed/migrations on server (e.g. docker exec ... npx tsx src/lib/db/seed.ts)
COPY --from=builder /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/db ./src/lib/db

# Schema migration (app applies it on first run if DB has no tables)
COPY --from=builder /app/drizzle ./drizzle

# SQLite data directory (will be overlaid by a persistent volume)
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

COPY docker-entrypoint.sh /docker-entrypoint.sh
# Ensure LF line endings (avoids "no such file or directory" when script has CRLF on Windows)
RUN sed -i 's/\r$//' /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
