/**
 * Seeds minimal data after db:reset: default categories and 2 users.
 * Assumes empty tables (right after schema push). Uses same env vars as full seed.
 */
import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";
import { db } from "./index";
import { categories, users } from "./schema";
import { defaultCategories } from "./seed-data";

loadEnvConfig(process.cwd());

const DEFAULT_PASSWORD = process.env.SEED_USER_PASSWORD ?? "ChangeMe123!";

async function seedMinimal() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const user1Email = process.env.SEED_USER1_EMAIL ?? "matt@homefinance.local";
  const user2Email = process.env.SEED_USER2_EMAIL ?? "sydney@homefinance.local";
  const user1Name = process.env.SEED_USER1_NAME ?? "Matt";
  const user2Name = process.env.SEED_USER2_NAME ?? "Sydney";

  await db.insert(users).values([
    { name: user1Name, email: user1Email, passwordHash },
    { name: user2Name, email: user2Email, passwordHash },
  ]);
  console.log("Created 2 users:", user1Name + ",", user2Name + ".");

  await db
    .insert(categories)
    .values(
      defaultCategories.map((c) => ({
        name: c.name,
        groupName: c.groupName,
        sortOrder: c.sortOrder,
        costType: c.costType,
        defaultAmount: c.defaultAmount,
      }))
    );
  console.log(`Seeded ${defaultCategories.length} default categories.`);
  console.log("Default password for both:", DEFAULT_PASSWORD);
}

seedMinimal().catch((e) => {
  console.error(e);
  process.exit(1);
});
