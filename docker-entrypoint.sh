#!/bin/sh
set -e

# Fix ownership when a Docker/Coolify volume is mounted at /app/data (often root-owned)
chown -R nextjs:nodejs /app/data

# Drop privileges and exec the CMD (node server.js)
exec su-exec nextjs "$@"
