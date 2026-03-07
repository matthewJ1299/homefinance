/**
 * Seeds minimal data after db:reset: default categories and 2 users.
 * Assumes empty tables (right after schema push). Uses same env vars as full seed.
 */
import { createRequire } from "module";
import bcrypt from "bcryptjs";
import { saveDb, run, lastInsertId } from "./index";
import { defaultCategories } from "./seed-data";

const require = createRequire(import.meta.url);
try {
  const mod = require("@next/env");
  if (typeof mod.loadEnvConfig === "function") mod.loadEnvConfig(process.cwd());
} catch {
  // In Docker/standalone @next/env may not expose loadEnvConfig; use process.env (e.g. Coolify env vars).
}

const DEFAULT_PASSWORD = process.env.SEED_USER_PASSWORD ?? "ChangeMe123!";

async function seedMinimal() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const user1Email = process.env.SEED_USER1_EMAIL ?? "matt@homefinance.local";
  const user2Email = process.env.SEED_USER2_EMAIL ?? "sydney@homefinance.local";
  const user1Name = process.env.SEED_USER1_NAME ?? "Matt";
  const user2Name = process.env.SEED_USER2_NAME ?? "Sydney";

  await run("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)", [
    user1Name,
    user1Email,
    passwordHash,
  ]);
  await run("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)", [
    user2Name,
    user2Email,
    passwordHash,
  ]);
  console.log("Created 2 users:", user1Name + ",", user2Name + ".");

  for (const c of defaultCategories) {
    await run(
      "INSERT INTO categories (name, group_name, icon, sort_order, is_active, cost_type, default_amount) VALUES (?, ?, ?, ?, 1, ?, ?)",
      [c.name, c.groupName, null, c.sortOrder, c.costType, c.defaultAmount ?? null]
    );
  }
  console.log(`Seeded ${defaultCategories.length} default categories.`);
  console.log("Default password for both:", DEFAULT_PASSWORD);
}

(async () => {
  await seedMinimal();
  saveDb();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
