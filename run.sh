#!/bin/sh
# Run the Node app from its own directory so require("next") resolves.
# Use this if your host (e.g. LiteSpeed lsnode) starts the process with a different cwd.
cd "$(dirname "$0")"
exec npx tsx server.js
