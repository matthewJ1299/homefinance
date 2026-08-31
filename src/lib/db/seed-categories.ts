/**
 * Seeds minimal data after db:reset: households, default categories per household, split groups, and 2 users.
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

  await run(
    "INSERT INTO households (name, ai_feature_allowed, recon_feature_allowed) VALUES (?, true, true)",
    [`${user1Name} household`]
  );
  const household1Id = await lastInsertId();
  await run(
    "INSERT INTO households (name, ai_feature_allowed, recon_feature_allowed) VALUES (?, true, true)",
    [`${user2Name} household`]
  );
  const household2Id = await lastInsertId();

  await run(
    "INSERT INTO users (name, email, password_hash, household_id, ai_feature_allowed, recon_feature_allowed) VALUES (?, ?, ?, ?, true, true)",
    [user1Name, user1Email, passwordHash, household1Id]
  );
  await run(
    "INSERT INTO users (name, email, password_hash, household_id, ai_feature_allowed, recon_feature_allowed) VALUES (?, ?, ?, ?, true, true)",
    [user2Name, user2Email, passwordHash, household2Id]
  );
  console.log("Created 2 households and 2 users:", user1Name + ",", user2Name + ".");

  for (const hid of [household1Id, household2Id]) {
    for (const c of defaultCategories) {
      await run(
        "INSERT INTO categories (name, group_name, icon, sort_order, is_active, cost_type, default_amount, household_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [c.name, c.groupName, null, c.sortOrder, true, c.costType, c.defaultAmount ?? null, hid]
      );
    }
    await run(
      "INSERT INTO split_groups (name, is_default, sort_order, household_id) VALUES ('Default', true, 0, ?)",
      [hid]
    );
  }
  console.log(`Seeded ${defaultCategories.length} default categories per household and Default split groups.`);
  console.log("Default password for both:", DEFAULT_PASSWORD);
}

(async () => {
  await seedMinimal();
  saveDb();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
