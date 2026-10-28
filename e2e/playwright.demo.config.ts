import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import base from "./playwright.config";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The watchable run: one sign-in, one browser, the whole flow in order.
 *
 * Everything is inherited from the suite's own config -- same dev server, same
 * base URL -- with three differences: it only looks in e2e/demo, it is never
 * headless, and it moves slowly enough to follow.
 *
 * Desktop and phone are projects rather than an environment variable, so the
 * command is the same in bash and PowerShell:
 *
 *   npm run test:e2e:demo          # 1280x800, sidebar
 *   npm run test:e2e:demo:mobile   # Pixel 5, touch, bottom bar
 */
export default defineConfig({
  ...base,
  testDir: path.join(rootDir, "e2e", "demo"),
  reporter: [["list"]],
  use: {
    ...base.use,
    headless: false,
    launchOptions: { slowMo: Number(process.env.E2E_SLOW_MO ?? 350) },
    video: "on",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
});
