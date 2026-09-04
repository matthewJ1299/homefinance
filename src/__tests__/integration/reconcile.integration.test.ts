/**
 * Phase 0 guardrail: a total must equal the sum of its parts.
 *
 * The design review caught the same class of bug four times, so this runs over
 * three household sizes. The four-person fixture is the one that catches
 * `others[0]` — a pairwise assumption looks correct at two members.
 *
 * Requires DATABASE_URL and `npm run db:push`.
 */
import { describe, it, expect } from "vitest";
import { withHouseholdFixture } from "./helpers/fixture";
import { BudgetService } from "@/lib/services/budget.service";
import { ExpenseService } from "@/lib/services/expense.service";
import { getAccountTransactionRepository } from "@/lib/repositories";
import { AccountService } from "@/lib/services/account.service";

const HAS_DB = Boolean(process.env.DATABASE_URL);

describe.runIf(HAS_DB).each([
  ["one person", 1],
  ["two people", 2],
  ["four people", 4],
])("reconciliation — %s", (_label, memberCount) => {
  it("envelope total equals the sum of category availables", async () => {
    await withHouseholdFixture({ memberCount }, async ({ users, month }) => {
      const overview = await new BudgetService().getOverview(month, users[0].id);
      const summed = overview.categories.reduce((s, c) => s + c.available, 0);
      expect(overview.envelopeLeft).toBe(summed);
    });
  });

  it("category spent equals the sum of that user's own shares", async () => {
    await withHouseholdFixture({ memberCount }, async ({ users, month }) => {
      const me = users[0].id;
      const overview = await new BudgetService().getOverview(month, me);
      const { expenses } = await new ExpenseService().getByMonth(month, me);
      for (const row of overview.categories) {
        const fromLedger = expenses
          .filter((e) => e.categoryId === row.categoryId)
          .reduce((s, e) => s + (e.myShare ?? e.amount), 0);
        expect(row.spent).toBe(fromLedger);
      }
    });
  });

  it("assigned + carriedIn - spent === available for every category", async () => {
    await withHouseholdFixture({ memberCount }, async ({ users, month }) => {
      const overview = await new BudgetService().getOverview(month, users[0].id);
      for (const c of overview.categories) {
        expect(c.assigned + c.carriedIn - c.spent).toBe(c.available);
      }
    });
  });

  it("each account balance equals the sum of its transactions", async () => {
    await withHouseholdFixture({ memberCount }, async ({ users }) => {
      // The doc's `findAll()` / `findByAccountId()` are not on the interface.
      // AccountService is what carries a balance; comparing its aggregate SUM
      // against the paged row reader is the check that the two agree.
      const { accounts } = await new AccountService().listAccountsForUser(users[0].id);
      const txRepo = getAccountTransactionRepository();
      for (const a of accounts) {
        const txs = await txRepo.findByAccount(a.id, 100_000, 0);
        expect(a.balance).toBe(txs.reduce((s: number, t) => s + t.amount, 0));
      }
    });
  });

  it("one member's allocation never overwrites another's", async () => {
    if (memberCount < 2) return;
    await withHouseholdFixture({ memberCount }, async ({ users, month, categories }) => {
      const svc = new BudgetService();
      const cat = categories[0].id;
      await svc.setAllocation(cat, month, 500_000, users[0].id);
      await svc.setAllocation(cat, month, 250_000, users[1].id);
      const a = await svc.getOverview(month, users[0].id);
      const b = await svc.getOverview(month, users[1].id);
      expect(a.categories.find((c) => c.categoryId === cat)!.assigned).toBe(500_000);
      expect(b.categories.find((c) => c.categoryId === cat)!.assigned).toBe(250_000);
    });
  });
});
