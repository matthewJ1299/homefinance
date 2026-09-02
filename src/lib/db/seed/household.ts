import bcrypt from "bcryptjs";
import { FEATURE_KEYS } from "@/lib/features/registry";
import { bootstrapHouseholdDefaults } from "../bootstrap-household-defaults";
import { all, lastInsertId, run } from "../index";
import { defaultCategories } from "../seed-data";
import {
  SEED_HOUSEHOLD_NAME,
  SEED_MATT,
  SEED_PASSWORD,
  SEED_SYDNEY,
} from "./constants";
import type { SeedContext } from "./types";

async function grantAllHouseholdFeatures(
  householdId: number,
  grantedByUserId: number
): Promise<void> {
  for (const featureKey of FEATURE_KEYS) {
    await run(
      `INSERT INTO household_features (household_id, feature_key, enabled, granted_by_user_id, notes)
       VALUES (?, ?, true, ?, 'seed')`,
      [householdId, featureKey, grantedByUserId]
    );
  }
}

async function loadCategoryIds(householdId: number): Promise<Record<string, number>> {
  const rows = await all<{ id: number; name: string }>(
    "SELECT id, name FROM categories WHERE household_id = ? ORDER BY sort_order, id",
    [householdId]
  );
  const map: Record<string, number> = {};
  for (const row of rows) {
    map[row.name] = row.id;
  }
  return map;
}

async function loadDefaultSplitGroupId(householdId: number): Promise<number> {
  const row = await all<{ id: number }>(
    "SELECT id FROM split_groups WHERE household_id = ? AND is_default = true ORDER BY id LIMIT 1",
    [householdId]
  );
  const id = row[0]?.id;
  if (id == null) throw new Error("Default split group missing after bootstrap");
  return id;
}

export async function seedHousehold(): Promise<SeedContext> {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  if (SEED_MATT.email.trim().toLowerCase() === SEED_SYDNEY.email.trim().toLowerCase()) {
    throw new Error("SEED_USER1_EMAIL and SEED_USER2_EMAIL must be different.");
  }

  await run(
    `INSERT INTO households (name, ai_tier, approval_status, ai_feature_allowed, recon_feature_allowed)
     VALUES (?, 'free', 'active', true, true)`,
    [SEED_HOUSEHOLD_NAME]
  );
  const householdId = await lastInsertId();

  await run(
    `INSERT INTO users (name, email, password_hash, household_id, is_super_admin, budget_month_start_day, setup_wizard_status, setup_wizard_completed_at)
     VALUES (?, ?, ?, ?, true, 25, 'completed', NOW())`,
    [SEED_MATT.name, SEED_MATT.email, passwordHash, householdId]
  );
  const mattId = await lastInsertId();

  await run(
    `INSERT INTO users (name, email, password_hash, household_id, is_super_admin, budget_month_start_day, setup_wizard_status, setup_wizard_completed_at)
     VALUES (?, ?, ?, ?, false, 25, 'completed', NOW())`,
    [SEED_SYDNEY.name, SEED_SYDNEY.email, passwordHash, householdId]
  );
  const sydneyId = await lastInsertId();

  await grantAllHouseholdFeatures(householdId, mattId);
  await bootstrapHouseholdDefaults(householdId);

  const categoryIds = await loadCategoryIds(householdId);
  const splitGroupId = await loadDefaultSplitGroupId(householdId);

  const accounts = await seedAccounts(householdId, mattId, sydneyId);

  console.log(
    `Created household "${SEED_HOUSEHOLD_NAME}" with ${SEED_MATT.name} (super-admin) and ${SEED_SYDNEY.name}.`
  );
  console.log(`Seeded ${defaultCategories.length} categories and household_features for all plan features.`);

  return {
    householdId,
    mattId,
    sydneyId,
    splitGroupId,
    categoryIds,
    accounts,
  };
}

async function seedAccounts(
  householdId: number,
  mattId: number,
  sydneyId: number
): Promise<SeedContext["accounts"]> {
  async function insertUserAccounts(
    userId: number,
    bankName: string,
    savingsName: string,
    creditName: string
  ) {
    await run(
      "INSERT INTO accounts (name, type, owner_user_id, credit_limit, household_id) VALUES (?, 'bank', ?, NULL, ?)",
      [bankName, userId, householdId]
    );
    const bankAccountId = await lastInsertId();

    await run(
      "INSERT INTO accounts (name, type, owner_user_id, credit_limit, household_id) VALUES (?, 'savings', ?, NULL, ?)",
      [savingsName, userId, householdId]
    );
    const savingsAccountId = await lastInsertId();

    await run(
      "INSERT INTO accounts (name, type, owner_user_id, credit_limit, household_id) VALUES (?, 'credit', ?, ?, ?)",
      [creditName, userId, 200_000_00, householdId]
    );
    const creditAccountId = await lastInsertId();

    await run("UPDATE users SET primary_account_id = ? WHERE id = ?", [bankAccountId, userId]);

    return { bankAccountId, savingsAccountId, creditAccountId };
  }

  const matt = await insertUserAccounts(mattId, "FNB Fusion", "Capitec Savings", "FNB Credit Card");
  const sydney = await insertUserAccounts(
    sydneyId,
    "Capitec Main",
    "Capitec Tax Savings",
    "Capitec Credit"
  );

  console.log("Created bank, savings, and credit accounts for both users.");
  return { matt, sydney };
}
