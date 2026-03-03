import { loadEnvConfig } from "@next/env";
import { sql } from "drizzle-orm";
import { subMonths, format } from "date-fns";
import { db } from "./index";

loadEnvConfig(process.cwd());
import {
  users,
  categories,
  income,
  expenses,
  splitAllocations,
  splitSettlements,
  budgets,
  budgetTransfers,
  mortgageConfigs,
  mortgageUserConfigs,
  mortgagePayments,
  mortgageScheduleSnapshots,
} from "./schema";
import bcrypt from "bcryptjs";
import { defaultCategories } from "./seed-data";

const DEFAULT_PASSWORD = process.env.SEED_USER_PASSWORD ?? "ChangeMe123!";

async function seed() {
  console.log("Clearing existing data...");
  await db.delete(splitSettlements).where(sql`1=1`);
  await db.delete(splitAllocations).where(sql`1=1`);
  await db.delete(budgetTransfers).where(sql`1=1`);
  await db.delete(budgets).where(sql`1=1`);
  await db.delete(expenses).where(sql`1=1`);
  await db.delete(income).where(sql`1=1`);
  await db.delete(mortgageScheduleSnapshots).where(sql`1=1`);
  await db.delete(mortgagePayments).where(sql`1=1`);
  await db.delete(mortgageUserConfigs).where(sql`1=1`);
  await db.delete(mortgageConfigs).where(sql`1=1`);
  await db.delete(categories).where(sql`1=1`);
  await db.delete(users).where(sql`1=1`);
  console.log("Cleared. Seeding...");

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const user1Email = process.env.SEED_USER1_EMAIL ?? "matt@homefinance.local";
  const user2Email = process.env.SEED_USER2_EMAIL ?? "sydney@homefinance.local";
  const user1Name = process.env.SEED_USER1_NAME ?? "Matt";
  const user2Name = process.env.SEED_USER2_NAME ?? "Sydney";

  const insertedUsers = await db
    .insert(users)
    .values([
      { name: user1Name, email: user1Email, passwordHash },
      { name: user2Name, email: user2Email, passwordHash },
    ])
    .returning({ id: users.id });
  console.log("Created 2 users: Matt, Sydney.");

  const insertedCategories = await db
    .insert(categories)
    .values(
      defaultCategories.map((c) => ({
        name: c.name,
        groupName: c.groupName,
        sortOrder: c.sortOrder,
        costType: c.costType,
        defaultAmount: c.defaultAmount,
      }))
    )
    .returning({ id: categories.id });
  console.log("Created default categories.");

  await seedSampleTransactionsAndIncome(
    [insertedUsers[0]!.id, insertedUsers[1]!.id],
    insertedCategories.map((r) => r.id)
  );

  await seedSplitExpenses(
    [insertedUsers[0]!.id, insertedUsers[1]!.id],
    insertedCategories.map((r) => r.id)
  );

  console.log("Seed complete. Default password for both:", DEFAULT_PASSWORD);
}

/** Sample split expenses for the current month: who paid, total, and who owes what. */
async function seedSplitExpenses(
  userIds: [number, number],
  categoryIdsByOrder: number[]
) {
  const [userIdMatt, userIdSydney] = userIds;
  const now = new Date();
  const month = format(now, "yyyy-MM");
  const categoryIds = {
    groceries: categoryIdsByOrder[0]!,
    diningOut: categoryIdsByOrder[2]!,
    utilities: categoryIdsByOrder[3]!,
  };

  const splitExpenses: Array<{
    paidByUserId: number;
    totalCents: number;
    categoryId: number;
    note: string;
    date: string;
    otherUserId: number;
    otherOwesCents: number;
  }> = [
    {
      paidByUserId: userIdMatt,
      totalCents: 50000,
      categoryId: categoryIds.groceries,
      note: "Groceries split equally",
      date: format(now, "yyyy-MM-dd"),
      otherUserId: userIdSydney,
      otherOwesCents: 25000,
    },
    {
      paidByUserId: userIdSydney,
      totalCents: 30000,
      categoryId: categoryIds.diningOut,
      note: "Dinner split equally",
      date: format(now, "yyyy-MM-dd"),
      otherUserId: userIdMatt,
      otherOwesCents: 15000,
    },
    {
      paidByUserId: userIdMatt,
      totalCents: 100000,
      categoryId: categoryIds.utilities,
      note: "Electricity – I am owed the full amount",
      date: format(now, "yyyy-MM-dd"),
      otherUserId: userIdSydney,
      otherOwesCents: 100000,
    },
  ];

  for (const s of splitExpenses) {
    const splitGroupId = `split-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [expense] = await db
      .insert(expenses)
      .values({
        userId: s.paidByUserId,
        categoryId: s.categoryId,
        amount: s.totalCents,
        note: s.note,
        date: s.date,
        month,
        splitGroupId,
        paidByUserId: s.paidByUserId,
      })
      .returning({ id: expenses.id });
    await db.insert(splitAllocations).values({
      expenseId: expense!.id,
      userId: s.otherUserId,
      amount: s.otherOwesCents,
    });
  }
  console.log(`Created ${splitExpenses.length} split expenses.`);
}

/** 3 months of income and expenses for both users. */
async function seedSampleTransactionsAndIncome(
  userIds: [number, number],
  categoryIdsByOrder: number[]
) {
  const now = new Date();
  const months = [
    format(subMonths(now, 2), "yyyy-MM"),
    format(subMonths(now, 1), "yyyy-MM"),
    format(now, "yyyy-MM"),
  ];

  const [userIdMatt, userIdSydney] = userIds;
  const categoryIds = {
    groceries: categoryIdsByOrder[0]!,
    transport: categoryIdsByOrder[1]!,
    diningOut: categoryIdsByOrder[2]!,
    utilities: categoryIdsByOrder[3]!,
    entertainment: categoryIdsByOrder[4]!,
    healthcare: categoryIdsByOrder[5]!,
    insurance: categoryIdsByOrder[6]!,
    savings: categoryIdsByOrder[7]!,
    clothing: categoryIdsByOrder[8]!,
    education: categoryIdsByOrder[9]!,
    home: categoryIdsByOrder[10]!,
    other: categoryIdsByOrder[11]!,
  };

  const incomeRows: Array<{
    userId: number;
    amount: number;
    type: "salary" | "ad_hoc";
    description: string | null;
    date: string;
    month: string;
  }> = [];
  const expenseRows: Array<{
    userId: number;
    categoryId: number;
    amount: number;
    note: string | null;
    date: string;
    month: string;
  }> = [];

  for (const month of months) {
    const [y, m] = month.split("-").map(Number);

    incomeRows.push(
      {
        userId: userIdMatt,
        amount: 85000,
        type: "salary",
        description: "Monthly salary",
        date: format(new Date(y, m - 1, 25), "yyyy-MM-dd"),
        month,
      },
      {
        userId: userIdSydney,
        amount: 72000,
        type: "salary",
        description: "Monthly salary",
        date: format(new Date(y, m - 1, 28), "yyyy-MM-dd"),
        month,
      },
      {
        userId: userIdMatt,
        amount: 2500,
        type: "ad_hoc",
        description: "Freelance",
        date: format(new Date(y, m - 1, 15), "yyyy-MM-dd"),
        month,
      }
    );

    const expenseTemplates: Array<{ categoryId: number; amount: number; note: string }> = [
      { categoryId: categoryIds.groceries, amount: 42000, note: "Supermarket" },
      { categoryId: categoryIds.transport, amount: 3500, note: "Fuel" },
      { categoryId: categoryIds.diningOut, amount: 8000, note: "Restaurants" },
      { categoryId: categoryIds.utilities, amount: 12000, note: "Electricity, water" },
      { categoryId: categoryIds.entertainment, amount: 4500, note: "Streaming, outings" },
      { categoryId: categoryIds.healthcare, amount: 2100, note: "Medical" },
      { categoryId: categoryIds.insurance, amount: 5800, note: "Car insurance" },
      { categoryId: categoryIds.savings, amount: 15000, note: "Savings transfer" },
      { categoryId: categoryIds.home, amount: 9500, note: "Supplies" },
      { categoryId: categoryIds.other, amount: 2400, note: "Misc" },
    ];

    for (let day = 1; day <= 28; day += 3) {
      const date = new Date(y, m - 1, Math.min(day, 28));
      const template =
        expenseTemplates[Math.floor((day - 1) / 3) % expenseTemplates.length];
      expenseRows.push({
        userId: day % 2 === 1 ? userIdMatt : userIdSydney,
        categoryId: template.categoryId,
        amount: template.amount + (day % 5) * 200,
        note: template.note,
        date: format(date, "yyyy-MM-dd"),
        month,
      });
    }
  }

  await db.insert(income).values(incomeRows);
  await db.insert(expenses).values(expenseRows);
  console.log(
    `Sample data: ${incomeRows.length} income entries, ${expenseRows.length} expenses across ${months.length} months (${months.join(", ")}).`
  );
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
