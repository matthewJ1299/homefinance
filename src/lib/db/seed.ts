import { createRequire } from "module";
import { subMonths, format } from "date-fns";
import { initDb, saveDb, run, lastInsertId } from "./index";
import bcrypt from "bcryptjs";
import { defaultCategories } from "./seed-data";

const require = createRequire(import.meta.url);
try {
  const mod = require("@next/env");
  if (typeof mod.loadEnvConfig === "function") mod.loadEnvConfig(process.cwd());
} catch {
  // In Docker/standalone @next/env may not expose loadEnvConfig; use process.env (e.g. Coolify env vars).
}

const DEFAULT_PASSWORD = process.env.SEED_USER_PASSWORD ?? "ChangeMe123!";

async function seed() {
  console.log("Clearing existing data...");
  run("DELETE FROM split_settlements");
  run("DELETE FROM split_allocations");
  run("DELETE FROM budget_transfers");
  run("DELETE FROM budgets");
  run("DELETE FROM expenses");
  run("DELETE FROM income");
  run("DELETE FROM mortgage_schedule_snapshots");
  run("DELETE FROM mortgage_payments");
  run("DELETE FROM mortgage_user_configs");
  run("DELETE FROM mortgage_configs");
  run("DELETE FROM categories");
  run("DELETE FROM users");
  console.log("Cleared. Seeding...");

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const user1Email = process.env.SEED_USER1_EMAIL ?? "matt@homefinance.local";
  const user2Email = process.env.SEED_USER2_EMAIL ?? "sydney@homefinance.local";
  const user1Name = process.env.SEED_USER1_NAME ?? "Matt";
  const user2Name = process.env.SEED_USER2_NAME ?? "Sydney";

  run("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)", [
    user1Name,
    user1Email,
    passwordHash,
  ]);
  const user1Id = lastInsertId();
  run("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)", [
    user2Name,
    user2Email,
    passwordHash,
  ]);
  const user2Id = lastInsertId();
  console.log("Created 2 users: Matt, Sydney.");

  const insertedCategoryIds: number[] = [];
  for (const c of defaultCategories) {
    run(
      "INSERT INTO categories (name, group_name, icon, sort_order, is_active, cost_type, default_amount) VALUES (?, ?, ?, ?, 1, ?, ?)",
      [c.name, c.groupName, null, c.sortOrder, c.costType, c.defaultAmount ?? null]
    );
    insertedCategoryIds.push(lastInsertId());
  }
  console.log("Created default categories.");

  await seedSampleTransactionsAndIncome(
    [user1Id, user2Id],
    insertedCategoryIds
  );

  await seedBudgets([user1Id, user2Id], insertedCategoryIds);

  await seedSplitExpenses([user1Id, user2Id], insertedCategoryIds);

  await seedMortgage([user1Id, user2Id]);

  console.log("Seed complete. Default password for both:", DEFAULT_PASSWORD);
}

const MORTGAGE_PAYMENT_COUNT = 15;

/** Seed one mortgage config, two user configs, and about 15 payments. */
async function seedMortgage(userIds: [number, number]) {
  const [user1Id, user2Id] = userIds;
  const startDate = format(subMonths(new Date(), MORTGAGE_PAYMENT_COUNT), "yyyy-MM-dd");
  const propertyValue = 2_500_000_00; // R2.5m in cents
  const loanAmount = 2_000_000_00; // R2m in cents
  const annualRate = 0.11;
  const loanTermMonths = 240;
  const monthlyPayment = 1_700_000; // R17,000 in cents (simplified; real calc would use PMT)

  run(
    "INSERT INTO mortgage_configs (property_value, loan_amount, annual_interest_rate, loan_term_months, start_date, target_equity_user_a_pct, is_active) VALUES (?, ?, ?, ?, ?, 0.5, 1)",
    [propertyValue, loanAmount, annualRate, loanTermMonths, startDate]
  );
  const mortgageId = lastInsertId();

  run(
    "INSERT INTO mortgage_user_configs (mortgage_id, user_id, initial_deposit, base_split_pct, monthly_cap) VALUES (?, ?, 0, 0.5, NULL)",
    [mortgageId, user1Id]
  );
  run(
    "INSERT INTO mortgage_user_configs (mortgage_id, user_id, initial_deposit, base_split_pct, monthly_cap) VALUES (?, ?, 0, 0.5, NULL)",
    [mortgageId, user2Id]
  );

  for (let monthNum = 1; monthNum <= MORTGAGE_PAYMENT_COUNT; monthNum++) {
    const paymentDate = format(
      subMonths(new Date(), MORTGAGE_PAYMENT_COUNT - monthNum),
      "yyyy-MM-dd"
    );
    const interestPortion = Math.round((monthlyPayment * (16 - monthNum)) / 15);
    const principalPortion = monthlyPayment - interestPortion;
    const payeeUserId = monthNum % 2 === 1 ? user1Id : user2Id;
    run(
      "INSERT INTO mortgage_payments (mortgage_id, user_id, payment_date, month_number, amount, principal_portion, interest_portion, is_extra_payment, note) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL)",
      [
        mortgageId,
        payeeUserId,
        paymentDate,
        monthNum,
        monthlyPayment,
        principalPortion,
        interestPortion,
      ]
    );
  }
  console.log(`Created mortgage with ${MORTGAGE_PAYMENT_COUNT} payments.`);
}

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
    run(
      "INSERT INTO expenses (user_id, category_id, amount, note, date, month, split_group_id, paid_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        s.paidByUserId,
        s.categoryId,
        s.totalCents,
        s.note,
        s.date,
        month,
        splitGroupId,
        s.paidByUserId,
      ]
    );
    const expenseId = lastInsertId();
    run("INSERT INTO split_allocations (expense_id, user_id, amount) VALUES (?, ?, ?)", [
      expenseId,
      s.otherUserId,
      s.otherOwesCents,
    ]);
  }
  console.log(`Created ${splitExpenses.length} split expenses.`);
}

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
    type: string;
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

  for (const row of incomeRows) {
    run(
      "INSERT INTO income (user_id, amount, type, description, date, month) VALUES (?, ?, ?, ?, ?, ?)",
      [row.userId, row.amount, row.type, row.description, row.date, row.month]
    );
  }
  for (const row of expenseRows) {
    run(
      "INSERT INTO expenses (user_id, category_id, amount, note, date, month) VALUES (?, ?, ?, ?, ?, ?)",
      [row.userId, row.categoryId, row.amount, row.note, row.date, row.month]
    );
  }
  console.log(
    `Sample data: ${incomeRows.length} income entries, ${expenseRows.length} expenses across ${months.length} months (${months.join(", ")}).`
  );
}

/** Per-user budget allocations and optional transfers for the same months as seed data. */
async function seedBudgets(
  userIds: [number, number],
  categoryIdsByOrder: number[]
) {
  const now = new Date();
  const months = [
    format(subMonths(now, 2), "yyyy-MM"),
    format(subMonths(now, 1), "yyyy-MM"),
    format(now, "yyyy-MM"),
  ];

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

  const allocationByCategory: Array<{ categoryId: number; amount: number }> = [
    { categoryId: categoryIds.groceries, amount: 42000 },
    { categoryId: categoryIds.transport, amount: 3500 },
    { categoryId: categoryIds.diningOut, amount: 8000 },
    { categoryId: categoryIds.utilities, amount: 12000 },
    { categoryId: categoryIds.entertainment, amount: 4500 },
    { categoryId: categoryIds.healthcare, amount: 2100 },
    { categoryId: categoryIds.insurance, amount: 5800 },
    { categoryId: categoryIds.savings, amount: 15000 },
    { categoryId: categoryIds.home, amount: 9500 },
    { categoryId: categoryIds.other, amount: 2400 },
  ];

  for (const userId of userIds) {
    for (const month of months) {
      for (const { categoryId, amount } of allocationByCategory) {
        run(
          "INSERT INTO budgets (user_id, category_id, month, allocated_amount) VALUES (?, ?, ?, ?)",
          [userId, categoryId, month, amount]
        );
      }
    }
  }

  const currentMonth = format(now, "yyyy-MM");
  const transferAmount = 5000;
  for (const userId of userIds) {
    run(
      "INSERT INTO budget_transfers (from_category_id, to_category_id, month, amount, user_id, reason) VALUES (?, ?, ?, ?, ?, ?)",
      [
        categoryIds.savings,
        categoryIds.groceries,
        currentMonth,
        transferAmount,
        userId,
        "Seed transfer",
      ]
    );
    run(
      "UPDATE budgets SET allocated_amount = allocated_amount - ? WHERE user_id = ? AND category_id = ? AND month = ?",
      [transferAmount, userId, categoryIds.savings, currentMonth]
    );
    run(
      "UPDATE budgets SET allocated_amount = allocated_amount + ? WHERE user_id = ? AND category_id = ? AND month = ?",
      [transferAmount, userId, categoryIds.groceries, currentMonth]
    );
  }

  console.log(
    `Seeded per-user budgets for ${userIds.length} users across ${months.length} months and 2 transfers.`
  );
}

(async () => {
  await initDb();
  await seed();
  saveDb();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
