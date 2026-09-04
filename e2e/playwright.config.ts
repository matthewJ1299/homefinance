import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Headed by default so you can watch the suite.
 * CI / quiet runs: E2E_HEADLESS=1 npm run test:e2e
 * Faster watch:   E2E_SLOW_MO=0 npm run test:e2e
 * Step debugger:  npm run test:e2e:debug
 *
 * Uses port 3100 by default so a wedged process on :3000 cannot hang the suite.
 * Override with E2E_BASE_URL / E2E_PORT.
 */
const headless = process.env.E2E_HEADLESS === "1" || process.env.CI === "true";
const slowMoRaw = process.env.E2E_SLOW_MO;
const slowMo =
  slowMoRaw != null && slowMoRaw !== ""
    ? Number(slowMoRaw)
    : headless
      ? 0
      : 200;

const e2ePort = process.env.E2E_PORT ?? "3100";
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: path.join(rootDir, "e2e", "specs"),
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "test-results",
  use: {
    baseURL,
    headless,
    launchOptions: { slowMo: Number.isFinite(slowMo) ? slowMo : 0 },
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1280, height: 800 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${e2ePort}`,
    url: `${baseURL}/login`,
    reuseExistingServer: process.env.E2E_REUSE_SERVER === "1",
    timeout: 180_000,
    cwd: rootDir,
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://homefinance:homefinance@localhost:5433/homefinance",
      NEXTAUTH_URL: baseURL,
      AUTH_URL: baseURL,
    },
  },
});
