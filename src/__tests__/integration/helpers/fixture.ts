/**
 * Ephemeral household fixture for the reconciliation and rollover guardrails.
 *
 * Creates a household, `memberCount` members and a fixed set of categories,
 * runs the callback inside that household's request context, then removes
 * everything it made. Nothing is shared between fixtures, so the suites can run
 * in any order against a seeded database without disturbing it.
 */
import { BudgetService } from "@/lib/services/budget.service";
import { ExpenseService } from "@/lib/services/expense.service";
import { getCategoryRepository } from "@/lib/repositories";
import type { ICategoryRepository } from "@/lib/repositories/interfaces/category.repository";

export interface FixtureCategory {
  id: number;
  name: string;
}

export interface FixtureUser {
  id: number;
  name: string;
}

export interface FixtureServices {
  budget: BudgetService;
  expense: ExpenseService;
  /** The repository itself: the guardrails only need `update`, and there is no service layer over categories. */
  category: ICategoryRepository;
}

export interface FixtureContext {
  householdId: number;
  users: FixtureUser[];
  categories: FixtureCategory[];
  /** Three consecutive month keys, oldest first. */
  months: [string, string, string];
  /** Alias for `months[0]` — the month single-month assertions run against. */
  month: string;
  svc: FixtureServices;
}

/** Category names the guardrail suites reach for by name. */
const CATEGORY_NAMES = ["Groceries", "Fuel", "Car service", "Rent"] as const;

function monthKeysEndingBefore(now: Date): [string, string, string] {
  // Well clear of "today" so a budget-month start day cannot pull an expense
  // into a neighbouring month and make an assertion flaky.
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 8, 1));
  const keys = [0, 1, 2].map((offset) => {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + offset, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  return keys as [string, string, string];
}

export async function withHouseholdFixture(
  options: { memberCount: number },
  body: (ctx: FixtureContext) => Promise<void>
): Promise<void> {
  const { initDb, run, all, lastInsertId } = await import("@/lib/db");
  const { runWithRequestContext } = await import("@/lib/db/request-context");
  await initDb();

  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await run("INSERT INTO households (name, approval_status) VALUES (?, 'active')", [
    `__fixture_${stamp}`,
  ]);
  const householdId = await lastInsertId();

  const users: FixtureUser[] = [];
  try {
    for (let i = 0; i < options.memberCount; i++) {
      const name = `Member ${i + 1}`;
      await run(
        `INSERT INTO users (name, email, password_hash, household_id, budget_month_start_day)
         VALUES (?, ?, 'x', ?, 1)`,
        [name, `__fixture_${stamp}_${i}@test.local`, householdId]
      );
      users.push({ id: await lastInsertId(), name });
    }

    const categories: FixtureCategory[] = [];
    for (const [index, name] of CATEGORY_NAMES.entries()) {
      await run(
        `INSERT INTO categories (name, group_name, household_id, is_active, sort_order, cost_type)
         VALUES (?, 'Fixture', ?, true, ?, 'variable')`,
        [name, householdId, index]
      );
      categories.push({ id: await lastInsertId(), name });
    }

    const months = monthKeysEndingBefore(new Date());

    await runWithRequestContext(
      { householdId, userId: String(users[0].id), userName: users[0].name },
      async () => {
        await body({
          householdId,
          users,
          categories,
          months,
          month: months[0],
          svc: {
            budget: new BudgetService(),
            expense: new ExpenseService(),
            category: getCategoryRepository(),
          },
        });
      }
    );
  } finally {
    // Children first: expenses and budgets reference users and categories, and
    // only some of those FKs cascade.
    const ids = users.map((u) => u.id);
    if (ids.length > 0) {
      const ph = ids.map(() => "?").join(",");
      const expenseIds = await all<{ id: number }>(
        `SELECT id FROM expenses WHERE user_id IN (${ph})`,
        ids
      );
      if (expenseIds.length > 0) {
        const eph = expenseIds.map(() => "?").join(",");
        const eids = expenseIds.map((e) => e.id);
        await run(`DELETE FROM split_allocations WHERE expense_id IN (${eph})`, eids);
        await run(`DELETE FROM account_transactions WHERE reference_type = 'expense' AND reference_id IN (${eph})`, eids);
      }
      await run(`DELETE FROM split_settlements WHERE payer_user_id IN (${ph}) OR recipient_user_id IN (${ph})`, [...ids, ...ids]);
      await run(`DELETE FROM income WHERE user_id IN (${ph})`, ids);
      await run(`DELETE FROM expenses WHERE user_id IN (${ph})`, ids);
      // Templates outlive the rows they produce and reference the categories
      // deleted below, so they have to go before them.
      await run(`DELETE FROM recurring_expenses WHERE user_id IN (${ph})`, ids);
      await run(`DELETE FROM recurring_income WHERE user_id IN (${ph})`, ids);
      await run(`DELETE FROM budget_transfers WHERE user_id IN (${ph})`, ids);
      await run(`DELETE FROM budgets WHERE user_id IN (${ph})`, ids);
    }
    await run("DELETE FROM categories WHERE household_id = ?", [householdId]);
    await run("DELETE FROM users WHERE household_id = ?", [householdId]);
    await run("DELETE FROM households WHERE id = ?", [householdId]);
  }
}
