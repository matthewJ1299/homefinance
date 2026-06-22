import { createRequire } from "module";
import { subMonths, format } from "date-fns";
import { saveDb, run, lastInsertId } from "./index";
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

type UserAccounts = {
  bankAccountId: number;
  savingsAccountId: number;
  creditAccountId: number;
};

async function seedAccounts(userIds: [number, number]): Promise<Record<number, UserAccounts>> {
  const accountsByUser: Record<number, UserAccounts> = {};
  for (const userId of userIds) {
    const bankName = userId === userIds[0] ? "Matt Bank" : "Sydney Bank";
    const savingsName = userId === userIds[0] ? "Matt Savings" : "Sydney Savings";
    const creditName = userId === userIds[0] ? "Matt Credit Card" : "Sydney Credit Card";

    await run(
      "INSERT INTO accounts (name, type, owner_user_id, credit_limit) VALUES (?, ?, ?, ?)",
      [bankName, "bank", userId, null]
    );
    const bankAccountId = await lastInsertId();

    await run(
      "INSERT INTO accounts (name, type, owner_user_id, credit_limit) VALUES (?, ?, ?, ?)",
      [savingsName, "savings", userId, null]
    );
    const savingsAccountId = await lastInsertId();

    await run(
      "INSERT INTO accounts (name, type, owner_user_id, credit_limit) VALUES (?, ?, ?, ?)",
      [creditName, "credit", userId, 200_000_00] // R200,000 limit in cents
    );
    const creditAccountId = await lastInsertId();

    accountsByUser[userId] = { bankAccountId, savingsAccountId, creditAccountId };
  }
  console.log("Created accounts for users.");
  return accountsByUser;
}

async function seed() {
  console.log("Clearing existing data...");
  await run("DELETE FROM goal_contributions");
  await run("DELETE FROM goals");
  await run("DELETE FROM split_settlements");
  await run("DELETE FROM split_allocations");
  await run("DELETE FROM account_transactions");
  await run("DELETE FROM transfers");
  await run("DELETE FROM accounts");
  await run("DELETE FROM budget_transfers");
  await run("DELETE FROM budgets");
  await run("DELETE FROM expenses");
  await run("DELETE FROM income");
  await run("DELETE FROM mortgage_schedule_snapshots");
  await run("DELETE FROM mortgage_payments");
  await run("DELETE FROM mortgage_rate_periods");
  await run("DELETE FROM mortgage_user_configs");
  await run("DELETE FROM mortgage_configs");
  await run("DELETE FROM categories");
  await run("DELETE FROM users");
  console.log("Cleared. Seeding...");

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const user1Email = process.env.SEED_USER1_EMAIL ?? "matt@homefinance.local";
  const user2Email = process.env.SEED_USER2_EMAIL ?? "sydney@homefinance.local";
  const user1Name = process.env.SEED_USER1_NAME ?? "Matt";
  const user2Name = process.env.SEED_USER2_NAME ?? "Sydney";

  await run(
    "INSERT INTO users (name, email, password_hash, ai_feature_allowed, recon_feature_allowed) VALUES (?, ?, ?, true, true)",
    [user1Name, user1Email, passwordHash]
  );
  const user1Id = await lastInsertId();
  await run(
    "INSERT INTO users (name, email, password_hash, ai_feature_allowed, recon_feature_allowed) VALUES (?, ?, ?, true, true)",
    [user2Name, user2Email, passwordHash]
  );
  const user2Id = await lastInsertId();
  console.log("Created 2 users: Matt, Sydney.");

  const insertedCategoryIds: number[] = [];
  for (const c of defaultCategories) {
    await run(
      "INSERT INTO categories (name, group_name, icon, sort_order, is_active, cost_type, default_amount) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [c.name, c.groupName, null, c.sortOrder, true, c.costType, c.defaultAmount ?? null]
    );
    insertedCategoryIds.push(await lastInsertId());
  }
  console.log("Created default categories.");

  const accountsByUser = await seedAccounts([user1Id, user2Id]);

  await seedSampleTransactionsAndIncome(
    [user1Id, user2Id],
    insertedCategoryIds,
    accountsByUser
  );

  await seedGoals([user1Id, user2Id], accountsByUser);

  await seedBudgets([user1Id, user2Id], insertedCategoryIds);

  await seedSplitExpenses([user1Id, user2Id], insertedCategoryIds);

  await seedMortgage([user1Id, user2Id]);

  console.log("Seed complete. Default password for both:", DEFAULT_PASSWORD);
}

async function seedGoals(userIds: [number, number], accountsByUser: Record<number, UserAccounts>) {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const lastMonth = format(subMonths(now, 1), "yyyy-MM-dd");

  for (const userId of userIds) {
    const accounts = accountsByUser[userId]!;

    await run(
      "INSERT INTO goals (owner_user_id, name, type, target_amount, monthly_target, linked_account_id, apr, strategy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, "Car", "savings", 100_000_00, 5_000_00, accounts.savingsAccountId, null, null]
    );
    const savingsGoalId = await lastInsertId();

    await run(
      "INSERT INTO goals (owner_user_id, name, type, target_amount, monthly_target, linked_account_id, apr, strategy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, "Credit Card Payoff", "credit", null, 1_500_00, accounts.creditAccountId, 0.22, "avalanche"]
    );
    const creditGoalId = await lastInsertId();

    // Savings contributions: transfer bank -> savings, and link the transfer_in tx to the goal.
    for (const date of [lastMonth, today]) {
      await run(
        "INSERT INTO transfers (from_account_id, to_account_id, amount, note) VALUES (?, ?, ?, ?)",
        [accounts.bankAccountId, accounts.savingsAccountId, 5_000_00, "Goal contribution"]
      );
      const transferId = await lastInsertId();
      await run(
        "INSERT INTO account_transactions (account_id, amount, transaction_type, reference_type, reference_id, note) VALUES (?, ?, ?, ?, ?, ?)",
        [accounts.bankAccountId, -5_000_00, "transfer_out", "transfer", transferId, "Goal contribution"]
      );
      await run(
        "INSERT INTO account_transactions (account_id, amount, transaction_type, reference_type, reference_id, note) VALUES (?, ?, ?, ?, ?, ?)",
        [accounts.savingsAccountId, 5_000_00, "transfer_in", "transfer", transferId, "Goal contribution"]
      );
      const toTxId = await lastInsertId();

      await run(
        "INSERT INTO goal_contributions (goal_id, owner_user_id, account_transaction_id, kind, amount, effective_date, note) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [savingsGoalId, userId, toTxId, "contribution", 5_000_00, date, "Contribution"]
      );
    }

    // Credit payment: transfer bank -> credit, link the transfer_in tx to the goal.
    await run(
      "INSERT INTO transfers (from_account_id, to_account_id, amount, note) VALUES (?, ?, ?, ?)",
      [accounts.bankAccountId, accounts.creditAccountId, 1_500_00, "Credit payment"]
    );
    const payTransferId = await lastInsertId();
    await run(
      "INSERT INTO account_transactions (account_id, amount, transaction_type, reference_type, reference_id, note) VALUES (?, ?, ?, ?, ?, ?)",
      [accounts.bankAccountId, -1_500_00, "transfer_out", "transfer", payTransferId, "Credit payment"]
    );
    await run(
      "INSERT INTO account_transactions (account_id, amount, transaction_type, reference_type, reference_id, note) VALUES (?, ?, ?, ?, ?, ?)",
      [accounts.creditAccountId, 1_500_00, "transfer_in", "transfer", payTransferId, "Credit payment"]
    );
    const creditPayTxId = await lastInsertId();
    await run(
      "INSERT INTO goal_contributions (goal_id, owner_user_id, account_transaction_id, kind, amount, effective_date, note) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [creditGoalId, userId, creditPayTxId, "payment", 1_500_00, today, "Payment"]
    );

    // Manual interest: adjustment on credit account (negative amount), link to goal as kind=interest.
    await run(
      "INSERT INTO account_transactions (account_id, amount, transaction_type, reference_type, reference_id, note) VALUES (?, ?, ?, ?, ?, ?)",
      [accounts.creditAccountId, -250_00, "adjustment", null, null, "Interest"]
    );
    const interestTxId = await lastInsertId();
    await run(
      "INSERT INTO goal_contributions (goal_id, owner_user_id, account_transaction_id, kind, amount, effective_date, note) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [creditGoalId, userId, interestTxId, "interest", 250_00, today, "Interest"]
    );
  }

  console.log("Created sample goals and goal contributions.");
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

  await run(
    "INSERT INTO mortgage_configs (property_value, loan_amount, annual_interest_rate, loan_term_months, start_date, target_equity_user_a_pct, is_active) VALUES (?, ?, ?, ?, ?, 0.5, true)",
    [propertyValue, loanAmount, annualRate, loanTermMonths, startDate]
  );
  const mortgageId = await lastInsertId();

  await run(
    "INSERT INTO mortgage_user_configs (mortgage_id, user_id, initial_deposit, base_split_pct, monthly_cap) VALUES (?, ?, 0, 0.5, NULL)",
    [mortgageId, user1Id]
  );
  await run(
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
    await run(
      "INSERT INTO mortgage_payments (mortgage_id, user_id, payment_date, month_number, amount, principal_portion, interest_portion, is_extra_payment, note) VALUES (?, ?, ?, ?, ?, ?, ?, false, NULL)",
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
    await run(
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
    const expenseId = await lastInsertId();
    await run("INSERT INTO split_allocations (expense_id, user_id, amount) VALUES (?, ?, ?)", [
      expenseId,
      s.otherUserId,
      s.otherOwesCents,
    ]);
  }
  console.log(`Created ${splitExpenses.length} split expenses.`);
}

async function seedSampleTransactionsAndIncome(
  userIds: [number, number],
  categoryIdsByOrder: number[],
  accountsByUser: Record<number, UserAccounts>
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

    // Staggered expenses every ~2 days for both users to get 30+ per user across months.
    for (let day = 1; day <= 28; day += 2) {
      const baseTemplate =
        expenseTemplates[Math.floor((day - 1) / 3) % expenseTemplates.length];
      const baseAmount = baseTemplate.amount + (day % 5) * 200;

      const dateMatt = new Date(y, m - 1, Math.min(day, 28));
      expenseRows.push({
        userId: userIdMatt,
        categoryId: baseTemplate.categoryId,
        amount: baseAmount,
        note: baseTemplate.note,
        date: format(dateMatt, "yyyy-MM-dd"),
        month,
      });

      const dateSydney = new Date(y, m - 1, Math.min(day + 1, 28));
      expenseRows.push({
        userId: userIdSydney,
        categoryId: baseTemplate.categoryId,
        amount: baseAmount + 500,
        note: baseTemplate.note,
        date: format(dateSydney, "yyyy-MM-dd"),
        month,
      });
    }
  }

  for (const row of incomeRows) {
    const accounts = accountsByUser[row.userId];
    const accountId = accounts?.bankAccountId ?? null;
    await run(
      "INSERT INTO income (user_id, amount, type, description, date, month, account_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [row.userId, row.amount, row.type, row.description, row.date, row.month, accountId]
    );
    const incomeId = await lastInsertId();
    if (accountId != null) {
      await run(
        "INSERT INTO account_transactions (account_id, amount, transaction_type, reference_type, reference_id, note) VALUES (?, ?, ?, ?, ?, ?)",
        [accountId, row.amount, "income", "income", incomeId, row.description]
      );
    }
  }
  for (const row of expenseRows) {
    const accounts = accountsByUser[row.userId];
    const accountId = accounts?.bankAccountId ?? null;
    await run(
      "INSERT INTO expenses (user_id, category_id, amount, note, date, month, account_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [row.userId, row.categoryId, row.amount, row.note, row.date, row.month, accountId]
    );
    const expenseId = await lastInsertId();
    if (accountId != null) {
      await run(
        "INSERT INTO account_transactions (account_id, amount, transaction_type, reference_type, reference_id, note) VALUES (?, ?, ?, ?, ?, ?)",
        [accountId, -row.amount, "expense", "expense", expenseId, row.note]
      );
    }
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
        await run(
          "INSERT INTO budgets (user_id, category_id, month, allocated_amount) VALUES (?, ?, ?, ?)",
          [userId, categoryId, month, amount]
        );
      }
    }
  }

  const currentMonth = format(now, "yyyy-MM");
  const transferAmount = 5000;
  for (const userId of userIds) {
    await run(
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
    await run(
      "UPDATE budgets SET allocated_amount = allocated_amount - ? WHERE user_id = ? AND category_id = ? AND month = ?",
      [transferAmount, userId, categoryIds.savings, currentMonth]
    );
    await run(
      "UPDATE budgets SET allocated_amount = allocated_amount + ? WHERE user_id = ? AND category_id = ? AND month = ?",
      [transferAmount, userId, categoryIds.groceries, currentMonth]
    );
  }

  console.log(
    `Seeded per-user budgets for ${userIds.length} users across ${months.length} months and 2 transfers.`
  );
}

(async () => {
  await seed();
  saveDb();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
