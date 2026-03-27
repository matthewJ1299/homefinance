#!/bin/sh
set -e

# Apply pending migrations before starting the app
su-exec nextjs npx tsx src/lib/db/push.ts

# Drop privileges and exec the CMD (node server.js)
exec su-exec nextjs "$@"
