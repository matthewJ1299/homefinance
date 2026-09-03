import { randomUUID } from "crypto";
import { subMonths, format } from "date-fns";
import { all, lastInsertId, run } from "../index";
import { splitExpense } from "@/lib/services/finance/accounts";
import { SEED_INCOME_CENTS } from "./constants";
import type { SeedContext } from "./types";

const EXPENSE_TEMPLATES: Array<{ category: string; amount: number; note: string }> = [
  { category: "Groceries", amount: 425_000, note: "Checkers" },
  { category: "Transport", amount: 35_000, note: "Fuel" },
  { category: "Dining Out", amount: 80_000, note: "Restaurants" },
  { category: "Utilities", amount: 120_000, note: "Electricity, water" },
  { category: "Entertainment", amount: 45_000, note: "Streaming, outings" },
  { category: "Healthcare", amount: 21_000, note: "Medical aid co-pay" },
  { category: "Insurance", amount: 58_000, note: "Car insurance" },
  { category: "Savings", amount: 150_000, note: "Savings transfer" },
  { category: "Home", amount: 95_000, note: "House supplies" },
  { category: "Other", amount: 24_000, note: "Misc" },
];

const BUDGET_ALLOCATIONS: Array<{ category: string; amount: number }> = [
  { category: "Groceries", amount: 450_000 },
  { category: "Transport", amount: 40_000 },
  { category: "Dining Out", amount: 85_000 },
  { category: "Utilities", amount: 120_000 },
  { category: "Entertainment", amount: 50_000 },
  { category: "Healthcare", amount: 25_000 },
  { category: "Insurance", amount: 58_000 },
  { category: "Savings", amount: 150_000 },
  { category: "Home", amount: 100_000 },
  { category: "Other", amount: 30_000 },
];

export async function seedFinance(ctx: SeedContext): Promise<void> {
  await seedRecurring(ctx);
  await seedTransactionsAndIncome(ctx);
  await seedSplitExpenses(ctx);
  await seedGoals(ctx);
  await seedBudgets(ctx);
  await seedNotes(ctx);
}

async function seedRecurring(ctx: SeedContext): Promise<void> {
  const { householdId, mattId, sydneyId, categoryIds } = ctx;

  await run(
    "INSERT INTO recurring_income (user_id, household_id, amount, type, description, day_of_month) VALUES (?, ?, ?, 'salary', ?, 25)",
    [mattId, householdId, SEED_INCOME_CENTS.mattSalary, "Monthly salary"]
  );
  await run(
    "INSERT INTO recurring_income (user_id, household_id, amount, type, description, day_of_month) VALUES (?, ?, ?, 'salary', ?, 28)",
    [sydneyId, householdId, SEED_INCOME_CENTS.sydneySalary, "Monthly salary"]
  );

  await run(
    "INSERT INTO recurring_expenses (user_id, household_id, category_id, amount, note, day_of_month) VALUES (?, ?, ?, ?, ?, ?)",
    [mattId, householdId, categoryIds["Entertainment"]!, 15_900, "Netflix + Spotify", 1]
  );
  await run(
    "INSERT INTO recurring_expenses (user_id, household_id, category_id, amount, note, day_of_month) VALUES (?, ?, ?, ?, ?, ?)",
    [sydneyId, householdId, categoryIds["Healthcare"]!, 89_000, "Gym membership", 5]
  );
  await run(
    "INSERT INTO recurring_expenses (user_id, household_id, category_id, amount, note, day_of_month) VALUES (?, ?, ?, ?, ?, ?)",
    [mattId, householdId, categoryIds["Insurance"]!, 58_000, "Car insurance debit order", 15]
  );

  console.log("Created recurring income and expenses.");
}

async function seedTransactionsAndIncome(ctx: SeedContext): Promise<void> {
  const { householdId, mattId, sydneyId, categoryIds, accounts } = ctx;
  const now = new Date();
  const months = [
    format(subMonths(now, 2), "yyyy-MM"),
    format(subMonths(now, 1), "yyyy-MM"),
    format(now, "yyyy-MM"),
  ];

  let incomeCount = 0;
  let expenseCount = 0;

  for (const month of months) {
    const [y, m] = month.split("-").map(Number);

    const incomeRows = [
      {
        userId: mattId,
        amount: SEED_INCOME_CENTS.mattSalary,
        type: "salary",
        description: "Monthly salary",
        date: format(new Date(y, m - 1, 25), "yyyy-MM-dd"),
      },
      {
        userId: sydneyId,
        amount: SEED_INCOME_CENTS.sydneySalary,
        type: "salary",
        description: "Monthly salary",
        date: format(new Date(y, m - 1, 28), "yyyy-MM-dd"),
      },
      {
        userId: mattId,
        amount: SEED_INCOME_CENTS.mattFreelance,
        type: "ad_hoc",
        description: "Freelance invoice",
        date: format(new Date(y, m - 1, 15), "yyyy-MM-dd"),
      },
    ];

    for (const row of incomeRows) {
      const accountId =
        row.userId === mattId ? accounts.matt.bankAccountId : accounts.sydney.bankAccountId;
      await run(
        "INSERT INTO income (user_id, household_id, amount, type, description, date, month, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          row.userId,
          householdId,
          row.amount,
          row.type,
          row.description,
          row.date,
          month,
          accountId,
        ]
      );
      const incomeId = await lastInsertId();
      await run(
        "INSERT INTO account_transactions (account_id, amount, transaction_type, reference_type, reference_id, note) VALUES (?, ?, 'income', 'income', ?, ?)",
        [accountId, row.amount, incomeId, row.description]
      );
      incomeCount++;
    }

    for (let day = 1; day <= 28; day += 2) {
      for (const [userId, userAccounts] of [
        [mattId, accounts.matt] as const,
        [sydneyId, accounts.sydney] as const,
      ]) {
        const template = EXPENSE_TEMPLATES[Math.floor((day - 1) / 3) % EXPENSE_TEMPLATES.length]!;
        const categoryId = categoryIds[template.category];
        if (categoryId == null) continue;
        const amount = template.amount + (day % 5) * 2_000 + (userId === sydneyId ? 1_000 : 0);
        const date = format(
          new Date(y, m - 1, Math.min(day + (userId === sydneyId ? 1 : 0), 28)),
          "yyyy-MM-dd"
        );

        await run(
          "INSERT INTO expenses (user_id, household_id, category_id, amount, note, date, month, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [
            userId,
            householdId,
            categoryId,
            amount,
            template.note,
            date,
            month,
            userAccounts.bankAccountId,
          ]
        );
        const expenseId = await lastInsertId();
        await run(
          "INSERT INTO account_transactions (account_id, amount, transaction_type, reference_type, reference_id, note) VALUES (?, ?, 'expense', 'expense', ?, ?)",
          [userAccounts.bankAccountId, -amount, expenseId, template.note]
        );
        expenseCount++;
      }
    }
  }

  console.log(
    `Seeded ${incomeCount} income rows and ${expenseCount} expenses across ${months.join(", ")}.`
  );
}

async function seedSplitExpenses(ctx: SeedContext): Promise<void> {
  const { householdId, mattId, sydneyId, splitGroupId, categoryIds, accounts } = ctx;
  const month = format(new Date(), "yyyy-MM");
  const today = format(new Date(), "yyyy-MM-dd");
  const splitsCategoryId = categoryIds["Splits"]!;

  const sharedExpenses: Array<{
    payerId: number;
    payerAccountId: number;
    amount: number;
    note: string;
    date: string;
  }> = [
    {
      payerId: mattId,
      payerAccountId: accounts.matt.bankAccountId,
      amount: 86_500,
      note: "Date night dinner",
      date: today,
    },
    {
      payerId: sydneyId,
      payerAccountId: accounts.sydney.bankAccountId,
      amount: 124_800,
      note: "Weekly groceries split",
      date: today,
    },
    {
      payerId: mattId,
      payerAccountId: accounts.matt.bankAccountId,
      amount: 45_000,
      note: "Takeaways",
      date: format(new Date(), "yyyy-MM-08"),
    },
  ];

  for (const item of sharedExpenses) {
    await run(
      `INSERT INTO expenses (user_id, household_id, category_id, amount, note, date, month, account_id,
        paid_by_user_id, split_group_id, split_expense_group_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.payerId,
        householdId,
        splitsCategoryId,
        item.amount,
        item.note,
        item.date,
        month,
        item.payerAccountId,
        item.payerId,
        randomUUID(),
        splitGroupId,
      ]
    );
    const expenseId = await lastInsertId();
    await run(
      "INSERT INTO account_transactions (account_id, amount, transaction_type, reference_type, reference_id, note) VALUES (?, ?, 'expense', 'expense', ?, ?)",
      [item.payerAccountId, -item.amount, expenseId, item.note]
    );

    const shares = splitExpense({
      amount: item.amount,
      users: [String(mattId), String(sydneyId)],
    });
    for (const [userKey, shareAmount] of Object.entries(shares)) {
      await run("INSERT INTO split_allocations (expense_id, user_id, amount) VALUES (?, ?, ?)", [
        expenseId,
        Number(userKey),
        shareAmount,
      ]);
    }
  }

  const settlementAmount = 19_650;
  await run(
    "INSERT INTO split_settlements (payer_user_id, recipient_user_id, amount, date, split_expense_group_id, household_id) VALUES (?, ?, ?, ?, ?, ?)",
    [sydneyId, mattId, settlementAmount, today, splitGroupId, householdId]
  );

  console.log("Created shared split expenses and one settlement.");
}

async function seedGoals(ctx: SeedContext): Promise<void> {
  const { householdId, mattId, sydneyId, accounts } = ctx;
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const lastMonth = format(subMonths(now, 1), "yyyy-MM-dd");

  for (const [userId, userAccounts] of [
    [mattId, accounts.matt] as const,
    [sydneyId, accounts.sydney] as const,
  ]) {
    await run(
      "INSERT INTO goals (owner_user_id, household_id, name, type, target_amount, monthly_target, linked_account_id, apr, strategy) VALUES (?, ?, 'Emergency fund', 'savings', ?, ?, ?, NULL, NULL)",
      [userId, householdId, 150_000_00, 5_000_00, userAccounts.savingsAccountId]
    );
    const savingsGoalId = await lastInsertId();

    await run(
      "INSERT INTO goals (owner_user_id, household_id, name, type, target_amount, monthly_target, linked_account_id, apr, strategy) VALUES (?, ?, 'Credit card payoff', 'credit', NULL, ?, ?, 0.22, 'avalanche')",
      [userId, householdId, 2_000_00, userAccounts.creditAccountId]
    );
    const creditGoalId = await lastInsertId();

    for (const date of [lastMonth, today]) {
      await run(
        "INSERT INTO transfers (from_account_id, to_account_id, amount, note, household_id) VALUES (?, ?, ?, 'Goal contribution', ?)",
        [userAccounts.bankAccountId, userAccounts.savingsAccountId, 5_000_00, householdId]
      );
      const transferId = await lastInsertId();
      await run(
        "INSERT INTO account_transactions (account_id, amount, transaction_type, reference_type, reference_id, note) VALUES (?, ?, 'transfer_out', 'transfer', ?, 'Goal contribution')",
        [userAccounts.bankAccountId, -5_000_00, transferId]
      );
      await run(
        "INSERT INTO account_transactions (account_id, amount, transaction_type, reference_type, reference_id, note) VALUES (?, ?, 'transfer_in', 'transfer', ?, 'Goal contribution')",
        [userAccounts.savingsAccountId, 5_000_00, transferId]
      );
      const toTxId = await lastInsertId();
      await run(
        "INSERT INTO goal_contributions (goal_id, owner_user_id, account_transaction_id, kind, amount, effective_date, note, household_id) VALUES (?, ?, ?, 'contribution', ?, ?, 'Contribution', ?)",
        [savingsGoalId, userId, toTxId, 5_000_00, date, householdId]
      );
    }

    await run(
      "INSERT INTO transfers (from_account_id, to_account_id, amount, note, household_id) VALUES (?, ?, ?, 'Credit payment', ?)",
      [userAccounts.bankAccountId, userAccounts.creditAccountId, 2_000_00, householdId]
    );
    const payTransferId = await lastInsertId();
    await run(
      "INSERT INTO account_transactions (account_id, amount, transaction_type, reference_type, reference_id, note) VALUES (?, ?, 'transfer_out', 'transfer', ?, 'Credit payment')",
      [userAccounts.bankAccountId, -2_000_00, payTransferId]
    );
    await run(
      "INSERT INTO account_transactions (account_id, amount, transaction_type, reference_type, reference_id, note) VALUES (?, ?, 'transfer_in', 'transfer', ?, 'Credit payment')",
      [userAccounts.creditAccountId, 2_000_00, payTransferId]
    );
    const creditPayTxId = await lastInsertId();
    await run(
      "INSERT INTO goal_contributions (goal_id, owner_user_id, account_transaction_id, kind, amount, effective_date, note, household_id) VALUES (?, ?, ?, 'payment', ?, ?, 'Payment', ?)",
      [creditGoalId, userId, creditPayTxId, 2_000_00, today, householdId]
    );

    await run(
      "INSERT INTO account_transactions (account_id, amount, transaction_type, reference_type, reference_id, note) VALUES (?, ?, 'adjustment', NULL, NULL, 'Interest')",
      [userAccounts.creditAccountId, -350_00]
    );
    const interestTxId = await lastInsertId();
    await run(
      "INSERT INTO goal_contributions (goal_id, owner_user_id, account_transaction_id, kind, amount, effective_date, note, household_id) VALUES (?, ?, ?, 'interest', ?, ?, 'Interest', ?)",
      [creditGoalId, userId, interestTxId, 350_00, today, householdId]
    );
  }

  console.log("Created savings and credit goals with contributions for both users.");
}

async function seedBudgets(ctx: SeedContext): Promise<void> {
  const { householdId, mattId, categoryIds } = ctx;
  const now = new Date();
  const months = [
    format(subMonths(now, 2), "yyyy-MM"),
    format(subMonths(now, 1), "yyyy-MM"),
    format(now, "yyyy-MM"),
  ];
  const currentMonth = format(now, "yyyy-MM");

  for (const month of months) {
    for (const { category, amount } of BUDGET_ALLOCATIONS) {
      const categoryId = categoryIds[category];
      if (categoryId == null) continue;
      await run(
        "INSERT INTO budgets (user_id, household_id, category_id, month, allocated_amount) VALUES (?, ?, ?, ?, ?)",
        [mattId, householdId, categoryId, month, amount]
      );
    }
  }

  const savingsId = categoryIds["Savings"]!;
  const groceriesId = categoryIds["Groceries"]!;
  const transferAmount = 50_000;
  await run(
    "INSERT INTO budget_transfers (from_category_id, to_category_id, month, amount, user_id, reason, household_id) VALUES (?, ?, ?, ?, ?, 'Seed transfer to groceries', ?)",
    [savingsId, groceriesId, currentMonth, transferAmount, mattId, householdId]
  );
  await run(
    "UPDATE budgets SET allocated_amount = allocated_amount - ? WHERE user_id = ? AND household_id = ? AND category_id = ? AND month = ?",
    [transferAmount, mattId, householdId, savingsId, currentMonth]
  );
  await run(
    "UPDATE budgets SET allocated_amount = allocated_amount + ? WHERE user_id = ? AND household_id = ? AND category_id = ? AND month = ?",
    [transferAmount, mattId, householdId, groceriesId, currentMonth]
  );

  console.log(`Seeded household budgets across ${months.length} months.`);
}

async function seedNotes(ctx: SeedContext): Promise<void> {
  const { householdId, mattId, sydneyId } = ctx;

  const goalRows = await all<{ id: number; owner_user_id: number }>(
    "SELECT id, owner_user_id FROM goals WHERE household_id = ? ORDER BY id LIMIT 1",
    [householdId]
  );

  if (goalRows[0]) {
    await run(
      "INSERT INTO notes (owner_user_id, household_id, linked_type, linked_id, body) VALUES (?, ?, 'goal', ?, ?)",
      [
        goalRows[0].owner_user_id,
        householdId,
        goalRows[0].id,
        "Target R150k by end of year; review monthly.",
      ]
    );
  }

  await run(
    "INSERT INTO notes (owner_user_id, household_id, linked_type, linked_id, body) VALUES (?, ?, 'household', ?, ?)",
    [mattId, householdId, householdId, "Seed data: Jordaan household demo notes."]
  );

  await run(
    "INSERT INTO notes (owner_user_id, household_id, linked_type, linked_id, body) VALUES (?, ?, 'user', ?, ?)",
    [sydneyId, householdId, sydneyId, "Remember to submit medical aid claims within 30 days."]
  );

  console.log("Created sample notes on goals and household.");
}
