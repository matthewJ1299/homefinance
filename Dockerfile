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

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && apk add --no-cache su-exec

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# sql.js is serverExternalPackages; standalone trace includes sql-wasm.js but not sql-wasm.wasm.
# Copy the package so require("sql.js") finds it and can load the WASM at runtime.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/sql.js /app/node_modules/sql.js

# Persisted at runtime via volume; entrypoint chowns so nextjs can write when volume is mounted
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
