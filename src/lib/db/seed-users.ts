import { saveDb, get, lastInsertId, run } from "./index";
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

type ExistingUserRow = {
  email: string;
  household_id: number | null;
  id: number;
  name: string;
};

async function seedUsers(): Promise<void> {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  if (SEED_MATT.email.trim().toLowerCase() === SEED_SYDNEY.email.trim().toLowerCase()) {
    throw new Error("SEED_USER1_EMAIL and SEED_USER2_EMAIL must be different.");
  }

  const householdId = await ensureJordaanHousehold();
  await upsertSeedUser({
    email: SEED_MATT.email,
    name: SEED_MATT.name,
    passwordHash,
    householdId,
    isSuperAdmin: true,
  });
  await upsertSeedUser({
    email: SEED_SYDNEY.email,
    name: SEED_SYDNEY.name,
    passwordHash,
    householdId,
    isSuperAdmin: false,
  });

  await ensureHouseholdFeatures(householdId);

  console.log("Users-only seed complete.");
  console.log(`Household: ${SEED_HOUSEHOLD_NAME} (id ${householdId})`);
  console.log("Seeded emails:", SEED_MATT.email, ",", SEED_SYDNEY.email);
  console.log("Seeded password:", SEED_PASSWORD);
}

type UpsertInput = {
  email: string;
  name: string;
  passwordHash: string;
  householdId: number;
  isSuperAdmin: boolean;
};

async function ensureJordaanHousehold(): Promise<number> {
  const existing = await get<{ id: number }>(
    "SELECT id FROM households WHERE name = ? ORDER BY id LIMIT 1",
    [SEED_HOUSEHOLD_NAME]
  );
  if (existing) {
    await run(
      "UPDATE households SET ai_tier = 'free', approval_status = 'active' WHERE id = ?",
      [existing.id]
    );
    return existing.id;
  }

  await run(
    // Entitlements live in household_features since migration 0030; the
    // households.*_feature_allowed columns it superseded are read by nothing.
    `INSERT INTO households (name, ai_tier, approval_status)
     VALUES (?, 'free', 'active')`,
    [SEED_HOUSEHOLD_NAME]
  );
  const householdId = await lastInsertId();
  if (householdId == null) {
    throw new Error(`Household insert did not return an id for ${SEED_HOUSEHOLD_NAME}`);
  }

  await bootstrapHouseholdDefaults(householdId);
  return householdId;
}

async function ensureHouseholdFeatures(householdId: number): Promise<void> {
  const matt = await get<{ id: number }>(
    "SELECT id FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1",
    [SEED_MATT.email.trim().toLowerCase()]
  );
  const grantedBy = matt?.id ?? null;

  for (const featureKey of FEATURE_KEYS) {
    await run(
      `INSERT INTO household_features (household_id, feature_key, enabled, granted_by_user_id, notes)
       VALUES (?, ?, true, ?, 'seed-users')
       ON CONFLICT (household_id, feature_key) DO UPDATE SET enabled = true`,
      [householdId, featureKey, grantedBy]
    );
  }
}

async function upsertSeedUser(input: UpsertInput): Promise<void> {
  const existing = await get<ExistingUserRow>(
    "SELECT id, name, email, household_id FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1",
    [input.email.trim().toLowerCase()]
  );

  if (existing) {
    await run(
      "UPDATE users SET name = ?, email = ?, password_hash = ?, household_id = ?, is_super_admin = ? WHERE id = ?",
      [input.name, input.email, input.passwordHash, input.householdId, input.isSuperAdmin, existing.id]
    );
    console.log(`Updated user ${input.email}.`);
    return;
  }

  await run(
    "INSERT INTO users (name, email, password_hash, household_id, is_super_admin, budget_month_start_day) VALUES (?, ?, ?, ?, ?, 1)",
    [input.name, input.email, input.passwordHash, input.householdId, input.isSuperAdmin]
  );
  console.log(`Created user ${input.email}.`);
}

(async () => {
  await seedUsers();
  saveDb();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
