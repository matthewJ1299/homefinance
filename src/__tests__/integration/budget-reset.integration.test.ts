/**
 * Budget reset: clears the envelope layer for one user, in one household,
 * without touching the financial history the figures are computed from.
 *
 * Requires DATABASE_URL and `npm run db:push`.
 */
import { describe, it, expect } from "vitest";
import { withHouseholdFixture } from "./helpers/fixture";

const HAS_DB = Boolean(process.env.DATABASE_URL);

describe.runIf(HAS_DB)("budget reset", () => {
  it("clears assignments, carry-over and transfers but leaves expenses", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async ({ users, months, categories, svc }) => {
      const { all } = await import("@/lib/db");
      const me = users[0].id;
      const groceries = categories.find((c) => c.name === "Groceries")!.id;
      const fuel = categories.find((c) => c.name === "Fuel")!.id;

      // Build a budget layer: assignments, an expense, a transfer, an opened month.
      await svc.budget.setAllocation(groceries, months[0], 500_000, me);
      await svc.budget.setAllocation(fuel, months[0], 250_000, me);
      await svc.expense.create(me, { categoryId: groceries, amount: 120_000, date: `${months[0]}-15` });
      await svc.budget.transfer({
        fromCategoryId: fuel,
        toCategoryId: groceries,
        month: months[0],
        amount: 10_000,
        userId: me,
      });
      await svc.budget.openMonth(months[1], me);

      const countFor = async (table: string) =>
        (await all<{ n: number }>(`SELECT count(*)::int AS n FROM ${table} WHERE user_id = ?`, [me]))[0].n;

      expect(await countFor("budgets")).toBeGreaterThan(0);
      expect(await countFor("budget_month_opens")).toBeGreaterThan(0);
      expect(await countFor("budget_transfers")).toBeGreaterThan(0);

      await svc.budget.resetBudget(me);

      expect(await countFor("budgets")).toBe(0);
      expect(await countFor("budget_month_opens")).toBe(0);
      expect(await countFor("budget_transfers")).toBe(0);
      // The financial history the budget is computed over is untouched.
      expect(await countFor("expenses")).toBe(1);
    });
  });

  it("clears only the calling user, not a housemate", async () => {
    await withHouseholdFixture({ memberCount: 2 }, async ({ users, months, categories, svc }) => {
      const { all } = await import("@/lib/db");
      const me = users[0].id;
      const mate = users[1].id;
      const cat = categories[0].id;

      await svc.budget.setAllocation(cat, months[0], 100_000, me);
      await svc.budget.setAllocation(cat, months[0], 200_000, mate);

      await svc.budget.resetBudget(me);

      const countFor = async (userId: number) =>
        (await all<{ n: number }>("SELECT count(*)::int AS n FROM budgets WHERE user_id = ?", [userId]))[0].n;

      expect(await countFor(me)).toBe(0);
      expect(await countFor(mate)).toBe(1);
    });
  });
});
