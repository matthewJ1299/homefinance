/**
 * Loads `.env.local` / `.env` into `process.env` inside the test worker.
 *
 * The config file's own `loadEnvConfig` runs in Vite's process, not in the
 * worker that imports the suites, so `process.env.DATABASE_URL` was undefined
 * by the time each file's `HAS_DB` was evaluated -- and every integration test
 * reported as skipped rather than failing. A guardrail suite that silently
 * skips is not guarding anything.
 *
 * Parsed here rather than via `@next/env` because resolving that package from
 * inside a Vite worker is what failed in the first place.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const file of [".env.local", ".env"]) {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), file), "utf8");
  } catch {
    continue; // CI supplies the environment directly.
  }
  for (const line of raw.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    // First file wins, and a real environment variable always wins over both.
    if (process.env[key] !== undefined) continue;
    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
