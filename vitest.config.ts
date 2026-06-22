import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    exclude: ["src/__tests__/integration/**"],
    testTimeout: 10000,
    hookTimeout: 15000,
  },
});
