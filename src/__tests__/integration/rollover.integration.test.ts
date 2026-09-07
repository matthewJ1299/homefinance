/**
 * Phase 0 guardrail: the carry chain across three months.
 *
 * Every case here describes behaviour Phase 2 introduces, so the suite is
 * marked `it.fails` until `openMonth` lands — the doc's instruction is to mark
 * them rather than delete them, and `it.fails` is a ratchet: once Phase 2 is in,
 * the marker itself fails and forces the flip back to `it`.
 *
 * Requires DATABASE_URL and `npm run db:push`.
 */
import { describe, it, expect } from "vitest";
import { withHouseholdFixture } from "./helpers/fixture";

const HAS_DB = Boolean(process.env.DATABASE_URL);

describe.runIf(HAS_DB)("rollover across three months", () => {
  it("carries a leftover into the same category", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async ({ users, months, categories, svc }) => {
      const me = users[0].id;
      const cat = categories.find((c) => c.name === "Car service")!.id;
      await svc.budget.setAllocation(cat, months[0], 40_000, me);
      await svc.budget.openMonth(months[1], me);
      const m2 = await svc.budget.getOverview(months[1], me);
      expect(m2.categories.find((c) => c.categoryId === cat)!.carriedIn).toBe(40_000);
      await svc.budget.openMonth(months[2], me);
      const m3 = await svc.budget.getOverview(months[2], me);
      expect(m3.categories.find((c) => c.categoryId === cat)!.carriedIn).toBe(80_000);
    });
  });

  it("an overspend does not carry into the category, it reduces unassigned", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async ({ users, months, categories, svc }) => {
      const me = users[0].id;
      const cat = categories.find((c) => c.name === "Groceries")!.id;
      await svc.budget.setAllocation(cat, months[0], 500_000, me);
      await svc.expense.create(me, { categoryId: cat, amount: 542_000, date: `${months[0]}-15` });
      await svc.budget.openMonth(months[1], me);
      const m2 = await svc.budget.getOverview(months[1], me);
      expect(m2.categories.find((c) => c.categoryId === cat)!.carriedIn).toBe(0);
      expect(m2.carriedOverspend).toBe(42_000);
      expect(m2.unassigned).toBe(m2.totalIncome - m2.totalAssigned - 42_000);
    });
  });

  it("covering the overspend first means nothing is deducted", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async ({ users, months, categories, svc }) => {
      const me = users[0].id;
      const groceries = categories.find((c) => c.name === "Groceries")!.id;
      const fuel = categories.find((c) => c.name === "Fuel")!.id;
      await svc.budget.setAllocation(groceries, months[0], 500_000, me);
      await svc.budget.setAllocation(fuel, months[0], 250_000, me);
      await svc.expense.create(me, { categoryId: groceries, amount: 542_000, date: `${months[0]}-15` });
      await svc.budget.coverOverspend({ fromCategoryId: fuel, toCategoryId: groceries, month: months[0], amount: 42_000, userId: me });
      await svc.budget.openMonth(months[1], me);
      expect((await svc.budget.getOverview(months[1], me)).carriedOverspend).toBe(0);
    });
  });

  it("openMonth is idempotent", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async ({ users, months, categories, svc }) => {
      const me = users[0].id;
      const cat = categories[0].id;
      await svc.budget.setAllocation(cat, months[0], 40_000, me);
      await svc.budget.openMonth(months[1], me);
      await svc.budget.openMonth(months[1], me);
      await svc.budget.openMonth(months[1], me);
      expect((await svc.budget.getOverview(months[1], me)).categories.find((c) => c.categoryId === cat)!.carriedIn).toBe(40_000);
    });
  });

  it("editing month 1 does not change month 3", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async ({ users, months, categories, svc }) => {
      const me = users[0].id;
      const cat = categories[0].id;
      await svc.budget.setAllocation(cat, months[0], 40_000, me);
      await svc.budget.openMonth(months[1], me);
      await svc.budget.openMonth(months[2], me);
      const before = await svc.budget.getOverview(months[2], me);
      await svc.budget.setAllocation(cat, months[0], 999_000, me);
      const after = await svc.budget.getOverview(months[2], me);
      expect(after.categories.find((c) => c.categoryId === cat)!.carriedIn)
        .toBe(before.categories.find((c) => c.categoryId === cat)!.carriedIn);
    });
  });

  it("carries through a month nobody opened", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async ({ users, months, categories, svc }) => {
      const me = users[0].id;
      const cat = categories.find((c) => c.name === "Fuel")!.id;
      // Assign and underspend M1, skip M2 entirely, then open M3.
      await svc.budget.setAllocation(cat, months[0], 40_000, me);
      await svc.budget.openMonthBacklog(me, months[2]);

      // M2 got its carry-in from M1, and M3 got its from M2 -- so the leftover
      // reaches M3 rather than reading zero through the gap.
      const m2 = await svc.budget.getOverview(months[1], me);
      expect(m2.categories.find((c) => c.categoryId === cat)!.carriedIn).toBe(40_000);
      const m3 = await svc.budget.getOverview(months[2], me);
      const row = m3.categories.find((c) => c.categoryId === cat)!;
      expect(row.carriedIn).toBe(80_000);
      // Spendable in M3 is this month's assignment (the M1 amount is still the
      // effective one) plus everything that carried through the gap.
      expect(row.available).toBe(row.assigned + 80_000);
    });
  });

  it("is idempotent across the backlog", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async ({ users, months, categories, svc }) => {
      const me = users[0].id;
      const cat = categories.find((c) => c.name === "Fuel")!.id;
      await svc.budget.setAllocation(cat, months[0], 40_000, me);
      await svc.budget.openMonthBacklog(me, months[2]);

      const first = await svc.budget.getOverview(months[2], me);
      await svc.budget.openMonthBacklog(me, months[2]);
      expect(await svc.budget.getOverview(months[2], me)).toEqual(first);
    });
  });

  it("rollover: false resets the category each month", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async ({ users, months, categories, svc }) => {
      const me = users[0].id;
      const cat = categories[0].id;
      await svc.category.update(cat, { rollover: false });
      await svc.budget.setAllocation(cat, months[0], 40_000, me);
      await svc.budget.openMonth(months[1], me);
      expect((await svc.budget.getOverview(months[1], me)).categories.find((c) => c.categoryId === cat)!.carriedIn).toBe(0);
    });
  });
});
