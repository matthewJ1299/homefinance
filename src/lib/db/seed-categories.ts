/**
 * Seeds minimal data after db:reset: one household, default categories, split group, and 2 users.
 * Assumes empty tables (right after schema push). Uses same env vars as full seed.
 */
import { saveDb, run, lastInsertId } from "./index";
import bcrypt from "bcryptjs";
import { FEATURE_KEYS } from "@/lib/features/registry";
import { bootstrapHouseholdDefaults } from "./bootstrap-household-defaults";
import "./seed/constants";
import {
  SEED_HOUSEHOLD_NAME,
  SEED_MATT,
  SEED_PASSWORD,
  SEED_SYDNEY,
} from "./seed/constants";

async function seedMinimal() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  if (SEED_MATT.email.trim().toLowerCase() === SEED_SYDNEY.email.trim().toLowerCase()) {
    throw new Error("SEED_USER1_EMAIL and SEED_USER2_EMAIL must be different.");
  }

  await run(
    // Entitlements live in household_features since migration 0030; the
    // households.*_feature_allowed columns it superseded are read by nothing.
    `INSERT INTO households (name, ai_tier, approval_status)
     VALUES (?, 'free', 'active')`,
    [SEED_HOUSEHOLD_NAME]
  );
  const householdId = await lastInsertId();

  await run(
    "INSERT INTO users (name, email, password_hash, household_id, is_super_admin, budget_month_start_day) VALUES (?, ?, ?, ?, true, 1)",
    [SEED_MATT.name, SEED_MATT.email, passwordHash, householdId]
  );
  const mattId = await lastInsertId();

  await run(
    "INSERT INTO users (name, email, password_hash, household_id, is_super_admin, budget_month_start_day) VALUES (?, ?, ?, ?, false, 1)",
    [SEED_SYDNEY.name, SEED_SYDNEY.email, passwordHash, householdId]
  );

  for (const featureKey of FEATURE_KEYS) {
    await run(
      `INSERT INTO household_features (household_id, feature_key, enabled, granted_by_user_id, notes)
       VALUES (?, ?, true, ?, 'seed-minimal')
       ON CONFLICT (household_id, feature_key)
       DO UPDATE SET enabled = true`,
      [householdId, featureKey, mattId]
    );
  }

  await bootstrapHouseholdDefaults(householdId);

  console.log(
    `Created household "${SEED_HOUSEHOLD_NAME}" with ${SEED_MATT.name} (super-admin) and ${SEED_SYDNEY.name}.`
  );
  console.log("Seeded all household_features, categories, split group, and calendar categories.");
  console.log("Default password for both:", SEED_PASSWORD);
}

(async () => {
  await seedMinimal();
  saveDb();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
