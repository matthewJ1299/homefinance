# ---------------------------------------------------------------------------
# Build stage
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

COPY . .

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

# sql.js WASM binary is not traced by standalone; copy the full package
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/sql.js ./node_modules/sql.js

# SQLite data directory (will be overlaid by a persistent volume)
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
