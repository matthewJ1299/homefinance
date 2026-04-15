import { createRequire } from "module";
import bcrypt from "bcryptjs";
import { get, lastInsertId, run, saveDb } from "./index";

const require = createRequire(import.meta.url);
try {
  const mod = require("@next/env");
  if (typeof mod.loadEnvConfig === "function") mod.loadEnvConfig(process.cwd());
} catch {
  // In Docker/standalone @next/env may not expose loadEnvConfig; use process.env (e.g. Coolify env vars).
}

const DEFAULT_PASSWORD = process.env.SEED_USER_PASSWORD ?? "ChangeMe123!";

type SeedUserInput = {
  email: string;
  householdName: string;
  name: string;
  passwordHash: string;
};

type ExistingUserRow = {
  email: string;
  household_id: number | null;
  id: number;
  name: string;
};

async function seedUsers(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const user1Email = process.env.SEED_USER1_EMAIL ?? "matt@homefinance.local";
  const user2Email = process.env.SEED_USER2_EMAIL ?? "sydney@homefinance.local";
  const user1Name = process.env.SEED_USER1_NAME ?? "Matt";
  const user2Name = process.env.SEED_USER2_NAME ?? "Sydney";

  if (user1Email.trim().toLowerCase() === user2Email.trim().toLowerCase()) {
    throw new Error("SEED_USER1_EMAIL and SEED_USER2_EMAIL must be different.");
  }

  const inputs: SeedUserInput[] = [
    {
      email: user1Email,
      householdName: `${user1Name} household`,
      name: user1Name,
      passwordHash,
    },
    {
      email: user2Email,
      householdName: `${user2Name} household`,
      name: user2Name,
      passwordHash,
    },
  ];

  for (const input of inputs) {
    await upsertSeedUser(input);
  }

  console.log("Users-only seed complete.");
  console.log("Seeded emails:", user1Email, ",", user2Email);
  console.log("Seeded password:", DEFAULT_PASSWORD);
}

async function upsertSeedUser(input: SeedUserInput): Promise<void> {
  const existing = await get<ExistingUserRow>(
    "SELECT id, name, email, household_id FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1",
    [input.email.trim().toLowerCase()]
  );

  if (existing) {
    const householdId = await ensureHouseholdForUser(existing, input.householdName);
    await run(
      "UPDATE users SET name = ?, email = ?, password_hash = ?, household_id = ? WHERE id = ?",
      [input.name, input.email, input.passwordHash, householdId, existing.id]
    );
    console.log(`Updated user ${input.email}.`);
    return;
  }

  const householdId = await createHousehold(input.householdName);
  await run(
    "INSERT INTO users (name, email, password_hash, household_id) VALUES (?, ?, ?, ?)",
    [input.name, input.email, input.passwordHash, householdId]
  );
  const userId = await lastInsertId();
  if (userId == null) {
    throw new Error(`User insert did not return an id for ${input.email}`);
  }
  console.log(`Created user ${input.email}.`);
}

async function ensureHouseholdForUser(
  user: ExistingUserRow,
  householdName: string
): Promise<number> {
  if (Number.isFinite(user.household_id) && user.household_id != null) {
    return user.household_id;
  }

  const householdId = await createHousehold(householdName);
  await run("UPDATE users SET household_id = ? WHERE id = ?", [householdId, user.id]);
  return householdId;
}

async function createHousehold(name: string): Promise<number> {
  await run("INSERT INTO households (name) VALUES (?)", [name]);
  const householdId = await lastInsertId();
  if (householdId == null) {
    throw new Error(`Household insert did not return an id for ${name}`);
  }
  return householdId;
}

(async () => {
  await seedUsers();
  saveDb();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
