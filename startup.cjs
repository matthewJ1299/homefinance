/**
 * Launcher for hosts (e.g. cPanel/LiteSpeed) that only allow a "startup file"
 * and run it with plain `node`. This script runs from the app directory and
 * starts the real server via `npx tsx server.js` so TypeScript and ESM work.
 * Set "Application startup file" to: startup.cjs
 */
const path = require("path");
const { spawn } = require("child_process");

const appDir = path.resolve(__dirname);
const child = spawn("npx", ["tsx", "server.js"], {
  cwd: appDir,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  process.exit(code != null ? code : signal ? 1 : 0);
});

child.on("error", (err) => {
  console.error("Failed to start tsx server:", err);
  process.exit(1);
});
