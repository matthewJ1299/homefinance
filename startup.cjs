/**
 * Launcher for hosts (e.g. cPanel/LiteSpeed) that only allow a "startup file"
 * and run it with plain `node`. This script runs from the app directory and
 * starts the real server via `npx tsx server.js` so TypeScript and ESM work.
 * Set "Application startup file" to: startup.cjs
 *
 * On cPanel, Shell Fork Bomb Protection limits process count (~35). To avoid
 * "Resource temporarily unavailable" / Tokio thread spawn failures, we pass
 * env that reduces thread usage (UV_THREADPOOL_SIZE, NODE_OPTIONS).
 */
const path = require("path");
const { spawn } = require("child_process");

const appDir = path.resolve(__dirname);

const env = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || "production",
  UV_THREADPOOL_SIZE: process.env.UV_THREADPOOL_SIZE || "4",
};
if (!process.env.NODE_OPTIONS) {
  env.NODE_OPTIONS = "--max-old-space-size=256";
}

const child = spawn("npx", ["tsx", "server.js"], {
  cwd: appDir,
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  process.exit(code != null ? code : signal ? 1 : 0);
});

child.on("error", (err) => {
  console.error("Failed to start tsx server:", err);
  process.exit(1);
});
