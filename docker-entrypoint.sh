#!/bin/sh
set -e

# Fix ownership when a Docker/Coolify volume is mounted at /app/data (often root-owned)
chown -R nextjs:nodejs /app/data

# When using Postgres, apply pending migrations (e.g. shared_lists) before starting the app
if [ -n "$DATABASE_URL" ]; then
  su-exec nextjs npx tsx src/lib/db/push.ts
fi

# Drop privileges and exec the CMD (node server.js)
exec su-exec nextjs "$@"
