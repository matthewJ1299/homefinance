import { createRequire } from "module";

const require = createRequire(import.meta.url);
try {
  const mod = require("@next/env");
  if (typeof mod.loadEnvConfig === "function") mod.loadEnvConfig(process.cwd());
} catch {
  // In Docker/standalone @next/env may not expose loadEnvConfig; use process.env (e.g. Coolify env vars).
}

export const SEED_PASSWORD = process.env.SEED_USER_PASSWORD ?? "ChangeMe123!";
export const SEED_HOUSEHOLD_NAME = process.env.SEED_HOUSEHOLD_NAME ?? "Jordaan household";

export const SEED_MATT = {
  name: process.env.SEED_USER1_NAME ?? "Matt",
  email: process.env.SEED_USER1_EMAIL ?? "matt@homefinance.local",
} as const;

export const SEED_SYDNEY = {
  name: process.env.SEED_USER2_NAME ?? "Sydney",
  email: process.env.SEED_USER2_EMAIL ?? "sydney@homefinance.local",
} as const;

/** Matt salary R42,500; Sydney salary R38,000 (minor units / cents). */
export const SEED_INCOME_CENTS = {
  mattSalary: 4_250_000,
  sydneySalary: 3_800_000,
  mattFreelance: 250_000,
} as const;
