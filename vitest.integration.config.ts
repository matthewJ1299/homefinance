import { createRequire } from "module";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

const require = createRequire(import.meta.url);
try {
  const mod = require("@next/env");
  if (typeof mod.loadEnvConfig === "function") mod.loadEnvConfig(process.cwd());
} catch {
  // Non-Next environments rely on process.env (e.g. CI / Coolify).
}

/** Integration tests only — require DATABASE_URL and seeded DB. */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["src/__tests__/integration/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
