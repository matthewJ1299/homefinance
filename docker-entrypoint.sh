#!/bin/sh
set -e
# When a volume is mounted at /app/data, it often has root ownership. Ensure nextjs can write.
chown -R nextjs:nodejs /app/data
exec su-exec nextjs "$@"
