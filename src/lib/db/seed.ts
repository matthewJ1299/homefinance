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

async function insertCategoriesForHousehold(householdId: number): Promise<number[]> {
  const ids: number[] = [];
  for (const c of defaultCategories) {
    await run(
      "INSERT INTO categories (name, group_name, icon, sort_order, is_active, cost_type, default_amount, household_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [c.name, c.groupName, null, c.sortOrder, true, c.costType, c.defaultAmount ?? null, householdId]
    );
    ids.push(await lastInsertId());
  }
  return ids;
}

async function insertDefaultSplitGroup(householdId: number): Promise<number> {
  await run(
    "INSERT INTO split_groups (name, is_default, sort_order, household_id) VALUES ('Default', true, 0, ?)",
    [householdId]
  );
  return await lastInsertId();
}

async function seedAccounts(
  userIds: [number, number],
  householdByUserId: Map<number, number>
): Promise<Record<number, UserAccounts>> {
  const accountsByUser: Record<number, UserAccounts> = {};
  for (const userId of userIds) {
    const hid = householdByUserId.get(userId);
    if (hid == null) throw new Error("Missing household for user");
    const bankName = userId === userIds[0] ? "Matt Bank" : "Sydney Bank";
    const savingsName = userId === userIds[0] ? "Matt Savings" : "Sydney Savings";
    const creditName = userId === userIds[0] ? "Matt Credit Card" : "Sydney Credit Card";

    await run(
      "INSERT INTO accounts (name, type, owner_user_id, credit_limit, household_id) VALUES (?, ?, ?, ?, ?)",
      [bankName, "bank", userId, null, hid]
    );
    const bankAccountId = await lastInsertId();

    await run(
      "INSERT INTO accounts (name, type, owner_user_id, credit_limit, household_id) VALUES (?, ?, ?, ?, ?)",
      [savingsName, "savings", userId, null, hid]
    );
    const savingsAccountId = await lastInsertId();

    await run(
      "INSERT INTO accounts (name, type, owner_user_id, credit_limit, household_id) VALUES (?, ?, ?, ?, ?)",
      [creditName, "credit", userId, 200_000_00, hid]
    );
    const creditAccountId = await lastInsertId();

    accountsByUser[userId] = { bankAccountId, savingsAccountId, creditAccountId };
  }
  console.log("Created accounts for users.");
  return accountsByUser;
}

async function seed() {
  console.log("Clearing existing data...");
  await run("DELETE FROM notes");
  await run("DELETE FROM sent_reminders");
  await run("DELETE FROM calendar_events");
  await run("DELETE FROM calendar_categories");
  await run("DELETE FROM shared_list_items");
  await run("DELETE FROM shared_lists");
  await run("DELETE FROM ai_analysis_runs");
  await run("DELETE FROM recon_import_items");
  await run("DELETE FROM recon_graph_connections");
  await run("DELETE FROM vendor_category_mappings");
  await run("DELETE FROM push_subscriptions");
  await run("DELETE FROM recurring_income");
  await run("DELETE FROM recurring_expenses");
  await run("DELETE FROM goal_contributions");
  await run("DELETE FROM goals");
  await run("DELETE FROM split_settlements");
  await run("DELETE FROM split_allocations");
  await run("DELETE FROM split_groups");
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
  await run("DELETE FROM households");
  console.log("Cleared. Seeding...");

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
  const user1Id = await lastInsertId();
  await run(
    "INSERT INTO users (name, email, password_hash, household_id, ai_feature_allowed, recon_feature_allowed) VALUES (?, ?, ?, ?, true, true)",
    [user2Name, user2Email, passwordHash, household2Id]
  );
  const user2Id = await lastInsertId();
  console.log("Created 2 households and 2 users (one household per user).");

  const householdByUserId = new Map<number, number>([
    [user1Id, household1Id],
    [user2Id, household2Id],
  ]);

  const categoryIdsUser1 = await insertCategoriesForHousehold(household1Id);
  const categoryIdsUser2 = await insertCategoriesForHousehold(household2Id);
  await insertDefaultSplitGroup(household1Id);
  await insertDefaultSplitGroup(household2Id);
  console.log("Created default categories and split groups per household.");

  const categoryIdsByUser: Record<number, number[]> = {
    [user1Id]: categoryIdsUser1,
    [user2Id]: categoryIdsUser2,
  };

  const accountsByUser = await seedAccounts([user1Id, user2Id], householdByUserId);

  await seedSampleTransactionsAndIncome(
    [user1Id, user2Id],
    categoryIdsByUser,
    accountsByUser,
    householdByUserId
  );

  await seedGoals([user1Id, user2Id], accountsByUser, householdByUserId);

  await seedBudgets([user1Id, user2Id], categoryIdsByUser, householdByUserId);

  await seedMortgage(user1Id, household1Id);
  await seedMortgage(user2Id, household2Id);

  console.log("Seed complete. Default password for both:", DEFAULT_PASSWORD);
}

async function seedGoals(
  userIds: [number, number],
  accountsByUser: Record<number, UserAccounts>,
  householdByUserId: Map<number, number>
) {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const lastMonth = format(subMonths(now, 1), "yyyy-MM-dd");

  for (const userId of userIds) {
    const hid = householdByUserId.get(userId);
    if (hid == null) throw new Error("Missing household");
    const accounts = accountsByUser[userId]!;

    await run(
      "INSERT INTO goals (owner_user_id, household_id, name, type, target_amount, monthly_target, linked_account_id, apr, strategy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, hid, "Car", "savings", 100_000_00, 5_000_00, accounts.savingsAccountId, null, null]
    );
    const savingsGoalId = await lastInsertId();

    await run(
      "INSERT INTO goals (owner_user_id, household_id, name, type, target_amount, monthly_target, linked_account_id, apr, strategy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, hid, "Credit Card Payoff", "credit", null, 1_500_00, accounts.creditAccountId, 0.22, "avalanche"]
    );
    const creditGoalId = await lastInsertId();

    for (const date of [lastMonth, today]) {
      await run(
        "INSERT INTO transfers (from_account_id, to_account_id, amount, note, household_id) VALUES (?, ?, ?, ?, ?)",
        [accounts.bankAccountId, accounts.savingsAccountId, 5_000_00, "Goal contribution", hid]
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
        "INSERT INTO goal_contributions (goal_id, owner_user_id, account_transaction_id, kind, amount, effective_date, note, household_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [savingsGoalId, userId, toTxId, "contribution", 5_000_00, date, "Contribution", hid]
      );
    }

    await run(
      "INSERT INTO transfers (from_account_id, to_account_id, amount, note, household_id) VALUES (?, ?, ?, ?, ?)",
      [accounts.bankAccountId, accounts.creditAccountId, 1_500_00, "Credit payment", hid]
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
      "INSERT INTO goal_contributions (goal_id, owner_user_id, account_transaction_id, kind, amount, effective_date, note, household_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [creditGoalId, userId, creditPayTxId, "payment", 1_500_00, today, "Payment", hid]
    );

    await run(
      "INSERT INTO account_transactions (account_id, amount, transaction_type, reference_type, reference_id, note) VALUES (?, ?, ?, ?, ?, ?)",
      [accounts.creditAccountId, -250_00, "adjustment", null, null, "Interest"]
    );
    const interestTxId = await lastInsertId();
    await run(
      "INSERT INTO goal_contributions (goal_id, owner_user_id, account_transaction_id, kind, amount, effective_date, note, household_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [creditGoalId, userId, interestTxId, "interest", 250_00, today, "Interest", hid]
    );
  }

  console.log("Created sample goals and goal contributions.");
}

const MORTGAGE_PAYMENT_COUNT = 15;

/** One mortgage config and payments for a single user within their household. */
async function seedMortgage(userId: number, householdId: number) {
  const startDate = format(subMonths(new Date(), MORTGAGE_PAYMENT_COUNT), "yyyy-MM-dd");
  const propertyValue = 2_500_000_00;
  const loanAmount = 2_000_000_00;
  const annualRate = 0.11;
  const loanTermMonths = 240;
  const monthlyPayment = 1_700_000;

  await run(
    "INSERT INTO mortgage_configs (property_value, loan_amount, annual_interest_rate, loan_term_months, start_date, target_equity_user_a_pct, is_active, household_id) VALUES (?, ?, ?, ?, ?, 0.5, true, ?)",
    [propertyValue, loanAmount, annualRate, loanTermMonths, startDate, householdId]
  );
  const mortgageId = await lastInsertId();

  await run(
    "INSERT INTO mortgage_user_configs (mortgage_id, user_id, initial_deposit, base_split_pct, monthly_cap, household_id) VALUES (?, ?, 0, 0.5, NULL, ?)",
    [mortgageId, userId, householdId]
  );

  for (let monthNum = 1; monthNum <= MORTGAGE_PAYMENT_COUNT; monthNum++) {
    const paymentDate = format(
      subMonths(new Date(), MORTGAGE_PAYMENT_COUNT - monthNum),
      "yyyy-MM-dd"
    );
    const interestPortion = Math.round((monthlyPayment * (16 - monthNum)) / 15);
    const principalPortion = monthlyPayment - interestPortion;
    await run(
      "INSERT INTO mortgage_payments (mortgage_id, user_id, payment_date, month_number, amount, principal_portion, interest_portion, is_extra_payment, note, household_id) VALUES (?, ?, ?, ?, ?, ?, ?, false, NULL, ?)",
      [
        mortgageId,
        userId,
        paymentDate,
        monthNum,
        monthlyPayment,
        principalPortion,
        interestPortion,
        householdId,
      ]
    );
  }
  console.log(`Created mortgage for user ${userId} with ${MORTGAGE_PAYMENT_COUNT} payments.`);
}

async function seedSampleTransactionsAndIncome(
  userIds: [number, number],
  categoryIdsByUser: Record<number, number[]>,
  accountsByUser: Record<number, UserAccounts>,
  householdByUserId: Map<number, number>
) {
  const now = new Date();
  const months = [
    format(subMonths(now, 2), "yyyy-MM"),
    format(subMonths(now, 1), "yyyy-MM"),
    format(now, "yyyy-MM"),
  ];

  const [userIdMatt, userIdSydney] = userIds;

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

    const catMatt = categoryIdsByUser[userIdMatt]!;
    const catSydney = categoryIdsByUser[userIdSydney]!;
    const categoryIdsMatt = {
      groceries: catMatt[0]!,
      transport: catMatt[1]!,
      diningOut: catMatt[2]!,
      utilities: catMatt[3]!,
      entertainment: catMatt[4]!,
      healthcare: catMatt[5]!,
      insurance: catMatt[6]!,
      savings: catMatt[7]!,
      clothing: catMatt[8]!,
      education: catMatt[9]!,
      home: catMatt[10]!,
      other: catMatt[11]!,
    };
    const categoryIdsSydney = {
      groceries: catSydney[0]!,
      transport: catSydney[1]!,
      diningOut: catSydney[2]!,
      utilities: catSydney[3]!,
      entertainment: catSydney[4]!,
      healthcare: catSydney[5]!,
      insurance: catSydney[6]!,
      savings: catSydney[7]!,
      clothing: catSydney[8]!,
      education: catSydney[9]!,
      home: catSydney[10]!,
      other: catSydney[11]!,
    };

    const expenseTemplatesMatt: Array<{ categoryId: number; amount: number; note: string }> = [
      { categoryId: categoryIdsMatt.groceries, amount: 42000, note: "Supermarket" },
      { categoryId: categoryIdsMatt.transport, amount: 3500, note: "Fuel" },
      { categoryId: categoryIdsMatt.diningOut, amount: 8000, note: "Restaurants" },
      { categoryId: categoryIdsMatt.utilities, amount: 12000, note: "Electricity, water" },
      { categoryId: categoryIdsMatt.entertainment, amount: 4500, note: "Streaming, outings" },
      { categoryId: categoryIdsMatt.healthcare, amount: 2100, note: "Medical" },
      { categoryId: categoryIdsMatt.insurance, amount: 5800, note: "Car insurance" },
      { categoryId: categoryIdsMatt.savings, amount: 15000, note: "Savings transfer" },
      { categoryId: categoryIdsMatt.home, amount: 9500, note: "Supplies" },
      { categoryId: categoryIdsMatt.other, amount: 2400, note: "Misc" },
    ];
    const expenseTemplatesSydney: Array<{ categoryId: number; amount: number; note: string }> = [
      { categoryId: categoryIdsSydney.groceries, amount: 42000, note: "Supermarket" },
      { categoryId: categoryIdsSydney.transport, amount: 3500, note: "Fuel" },
      { categoryId: categoryIdsSydney.diningOut, amount: 8000, note: "Restaurants" },
      { categoryId: categoryIdsSydney.utilities, amount: 12000, note: "Electricity, water" },
      { categoryId: categoryIdsSydney.entertainment, amount: 4500, note: "Streaming, outings" },
      { categoryId: categoryIdsSydney.healthcare, amount: 2100, note: "Medical" },
      { categoryId: categoryIdsSydney.insurance, amount: 5800, note: "Car insurance" },
      { categoryId: categoryIdsSydney.savings, amount: 15000, note: "Savings transfer" },
      { categoryId: categoryIdsSydney.home, amount: 9500, note: "Supplies" },
      { categoryId: categoryIdsSydney.other, amount: 2400, note: "Misc" },
    ];

    for (let day = 1; day <= 28; day += 2) {
      const baseTemplateMatt =
        expenseTemplatesMatt[Math.floor((day - 1) / 3) % expenseTemplatesMatt.length];
      const baseAmountMatt = baseTemplateMatt.amount + (day % 5) * 200;
      const dateMatt = new Date(y, m - 1, Math.min(day, 28));
      expenseRows.push({
        userId: userIdMatt,
        categoryId: baseTemplateMatt.categoryId,
        amount: baseAmountMatt,
        note: baseTemplateMatt.note,
        date: format(dateMatt, "yyyy-MM-dd"),
        month,
      });

      const baseTemplateSydney =
        expenseTemplatesSydney[Math.floor((day - 1) / 3) % expenseTemplatesSydney.length];
      const baseAmountSydney = baseTemplateSydney.amount + (day % 5) * 200;
      const dateSydney = new Date(y, m - 1, Math.min(day + 1, 28));
      expenseRows.push({
        userId: userIdSydney,
        categoryId: baseTemplateSydney.categoryId,
        amount: baseAmountSydney + 500,
        note: baseTemplateSydney.note,
        date: format(dateSydney, "yyyy-MM-dd"),
        month,
      });
    }
  }

  for (const row of incomeRows) {
    const accounts = accountsByUser[row.userId];
    const accountId = accounts?.bankAccountId ?? null;
    const householdId = householdByUserId.get(row.userId);
    if (householdId == null) throw new Error("Missing household for income row");
    await run(
      "INSERT INTO income (user_id, household_id, amount, type, description, date, month, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [row.userId, householdId, row.amount, row.type, row.description, row.date, row.month, accountId]
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
    const householdId = householdByUserId.get(row.userId);
    if (householdId == null) throw new Error("Missing household for expense row");
    await run(
      "INSERT INTO expenses (user_id, household_id, category_id, amount, note, date, month, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [row.userId, householdId, row.categoryId, row.amount, row.note, row.date, row.month, accountId]
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

async function seedBudgets(
  userIds: [number, number],
  categoryIdsByUser: Record<number, number[]>,
  householdByUserId: Map<number, number>
) {
  const now = new Date();
  const months = [
    format(subMonths(now, 2), "yyyy-MM"),
    format(subMonths(now, 1), "yyyy-MM"),
    format(now, "yyyy-MM"),
  ];

  for (const userId of userIds) {
    const hid = householdByUserId.get(userId);
    if (hid == null) throw new Error("Missing household");
    const cat = categoryIdsByUser[userId]!;
    const categoryIds = {
      groceries: cat[0]!,
      transport: cat[1]!,
      diningOut: cat[2]!,
      utilities: cat[3]!,
      entertainment: cat[4]!,
      healthcare: cat[5]!,
      insurance: cat[6]!,
      savings: cat[7]!,
      clothing: cat[8]!,
      education: cat[9]!,
      home: cat[10]!,
      other: cat[11]!,
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

    for (const month of months) {
      for (const { categoryId, amount } of allocationByCategory) {
        await run(
          "INSERT INTO budgets (user_id, household_id, category_id, month, allocated_amount) VALUES (?, ?, ?, ?, ?)",
          [userId, hid, categoryId, month, amount]
        );
      }
    }

    const currentMonth = format(now, "yyyy-MM");
    const transferAmount = 5000;
    await run(
      "INSERT INTO budget_transfers (from_category_id, to_category_id, month, amount, user_id, reason, household_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        categoryIds.savings,
        categoryIds.groceries,
        currentMonth,
        transferAmount,
        userId,
        "Seed transfer",
        hid,
      ]
    );
    await run(
      "UPDATE budgets SET allocated_amount = allocated_amount - ? WHERE user_id = ? AND household_id = ? AND category_id = ? AND month = ?",
      [transferAmount, userId, hid, categoryIds.savings, currentMonth]
    );
    await run(
      "UPDATE budgets SET allocated_amount = allocated_amount + ? WHERE user_id = ? AND household_id = ? AND category_id = ? AND month = ?",
      [transferAmount, userId, hid, categoryIds.groceries, currentMonth]
    );
  }

  console.log(
    `Seeded per-user budgets for ${userIds.length} users across ${months.length} months and 2 transfers each.`
  );
}

(async () => {
  await seed();
  saveDb();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
