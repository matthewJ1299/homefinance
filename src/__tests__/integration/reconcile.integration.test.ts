/**
 * Phase 0 guardrail: a total must equal the sum of its parts.
 *
 * The design review caught the same class of bug four times, so this runs over
 * three household sizes. The four-person fixture is the one that catches
 * a first-of-list pairwise assumption -- it looks correct at two members.
 *
 * Requires DATABASE_URL and `npm run db:push`.
 */
import { describe, it, expect } from "vitest";
import { withHouseholdFixture } from "./helpers/fixture";
import { BudgetService } from "@/lib/services/budget.service";
import { ExpenseService } from "@/lib/services/expense.service";
import {
  getAccountTransactionRepository,
  getAccountRepository,
  getBudgetRepository,
  getSplitAllocationRepository,
} from "@/lib/repositories";
import {
  budgetMonthKeyForUser,
  getDefaultBudgetMonthForUser,
} from "@/lib/utils/budget-month-for-user";
import { AccountService } from "@/lib/services/account.service";
import { PopulationService } from "@/lib/services/population.service";

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

  it("every expense carries participant rows that sum to its amount", async () => {
    await withHouseholdFixture({ memberCount }, async ({ householdId, users, categories, month }) => {
      // getByMonth falls back to the full amount when an expense has no
      // participant rows, so a write path that forgets them still reconciles --
      // by luck. Assert the rows themselves, so the invariant holds by
      // construction and PopulationService cannot quietly drop them again.
      const { all, run } = await import("@/lib/db");
      await run(
        `INSERT INTO recurring_expenses (user_id, household_id, category_id, amount, note, day_of_month)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [users[0].id, householdId, categories[0].id, 15_900, "Streaming", 5]
      );
      const populated = await new PopulationService().populateMonth(month, users[0].id);
      expect(populated.expensesCreated).toBeGreaterThan(0);
      const mismatched = await all<{ id: number; note: string | null }>(
        `SELECT e.id, e.note
           FROM expenses e
           LEFT JOIN expense_participants p ON p.expense_id = e.id
          WHERE e.household_id = ?
          GROUP BY e.id, e.note, e.amount
         HAVING COALESCE(SUM(p.share_minor), 0) <> e.amount`,
        [householdId]
      );
      expect(mismatched).toEqual([]);
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

  it("an uneven split still puts only my share in my envelope", async () => {
    if (memberCount < 2) return;
    await withHouseholdFixture({ memberCount }, async ({ users, month, categories }) => {
      const [me, them] = users;
      const cat = categories[0].id;

      // The case a slider cannot express: 560 and 140 of a 700 bill.
      await new ExpenseService().create(me.id, {
        categoryId: cat,
        amount: 70_000,
        date: `${month}-15`,
        participants: [
          { userId: me.id, shareMinor: 56_000 },
          { userId: them.id, shareMinor: 14_000 },
        ],
      });

      const mine = await new BudgetService().getOverview(month, me.id);
      expect(mine.categories.find((c) => c.categoryId === cat)!.spent).toBe(56_000);

      // And exactly one debt row for the other person, for exactly their share.
      const owed = await getSplitAllocationRepository().findAllForBalance();
      const theirs = owed.filter((a) => a.allocationUserId === them.id && a.amount === 14_000);
      expect(theirs).toHaveLength(1);
    });
  });

  it("a four-way uneven split still sums to the bill", async () => {
    if (memberCount < 4) return;
    await withHouseholdFixture({ memberCount }, async ({ users, month, categories }) => {
      const [me, ...others] = users;
      const cat = categories[1].id;
      // 500 / 200 / 200 / 100 of a 1000 bill.
      const participants = [
        { userId: me.id, shareMinor: 50_000 },
        { userId: others[0].id, shareMinor: 20_000 },
        { userId: others[1].id, shareMinor: 20_000 },
        { userId: others[2].id, shareMinor: 10_000 },
      ];
      expect(participants.reduce((s, p) => s + p.shareMinor, 0)).toBe(100_000);

      await new ExpenseService().create(me.id, {
        categoryId: cat,
        amount: 100_000,
        date: `${month}-16`,
        participants,
      });

      const mine = await new BudgetService().getOverview(month, me.id);
      expect(mine.categories.find((c) => c.categoryId === cat)!.spent).toBe(50_000);

      // One debt row per other participant, none for the payer.
      const owed = (await getSplitAllocationRepository().findAllForBalance()).filter(
        (a) => a.paidByUserId === me.id
      );
      expect(owed.filter((a) => a.allocationUserId === me.id)).toHaveLength(0);
      for (const p of participants.slice(1)) {
        expect(
          owed.filter((a) => a.allocationUserId === p.userId && a.amount === p.shareMinor)
        ).toHaveLength(1);
      }
    });
  });

  it("rejects a split whose shares do not add up to the bill", async () => {
    if (memberCount < 2) return;
    await withHouseholdFixture({ memberCount }, async ({ users, month, categories }) => {
      const [me, them] = users;
      await expect(
        new ExpenseService().create(me.id, {
          categoryId: categories[0].id,
          amount: 70_000,
          date: `${month}-17`,
          // R40 short: nothing should quietly cover the difference.
          participants: [
            { userId: me.id, shareMinor: 56_000 },
            { userId: them.id, shareMinor: 10_000 },
          ],
        })
      ).rejects.toThrow(/add up/i);
    });
  });

  it("never stores a negative assignment", async () => {
    await withHouseholdFixture({ memberCount }, async ({ users, month, categories, svc }) => {
      const me = users[0].id;
      const [a, b] = categories;
      // The shape that used to go negative: nothing assigned this month, money
      // present only as carry-in.
      await svc.budget.setAllocation(a.id, month, 0, me);
      await getBudgetRepository().setCarriedIn(a.id, month, 50_000, me);

      const moved = await svc.budget.transfer({
        fromCategoryId: a.id,
        toCategoryId: b.id,
        month,
        amount: 30_000,
        userId: me,
      });
      expect(moved.success).toBe(true);

      const after = await svc.budget.getOverview(month, me);
      for (const row of after.categories) expect(row.assigned).toBeGreaterThanOrEqual(0);
      const rowA = after.categories.find((c) => c.categoryId === a.id)!;
      const rowB = after.categories.find((c) => c.categoryId === b.id)!;
      expect(rowA.assigned).toBe(0);
      expect(rowA.carriedIn).toBe(20_000);
      expect(rowB.assigned).toBe(30_000);
    });
  });

  it("a transfer leaves the envelope total alone", async () => {
    await withHouseholdFixture({ memberCount }, async ({ users, month, categories, svc }) => {
      const me = users[0].id;
      const [a, b] = categories;
      // The source is funded by carry-in, not by this month's assignment.
      // That is the only shape where the old `assigned - amount` write showed
      // up as money appearing: a transfer out of a carry-funded envelope drove
      // `totalAssigned` down, which drove `unassigned` up by the same amount.
      await svc.budget.setAllocation(a.id, month, 0, me);
      await svc.budget.setAllocation(b.id, month, 10_000, me);
      await getBudgetRepository().setCarriedIn(a.id, month, 50_000, me);

      const before = await svc.budget.getOverview(month, me);
      const moved = await svc.budget.transfer({
        fromCategoryId: a.id,
        toCategoryId: b.id,
        month,
        amount: 30_000,
        userId: me,
      });
      expect(moved.success).toBe(true);

      const after = await svc.budget.getOverview(month, me);
      // Moving money between envelopes creates none and destroys none: the
      // envelope total and the spendable total both survive the move.
      expect(after.envelopeTotal).toBe(before.envelopeTotal);
      const spendable = (r: typeof before) =>
        r.categories.reduce((sum, c) => sum + c.available, 0);
      expect(spendable(after)).toBe(spendable(before));

      // `unassigned` is deliberately NOT asserted equal. Carry-in that becomes
      // a this-month assignment raises `totalAssigned`, so unassigned falls by
      // the carried portion. The bug this guards against moved it the other
      // way -- a negative assignment made unassigned *rise*, money from
      // nothing -- so the direction is what matters here.
      expect(after.unassigned).toBe(before.unassigned - 30_000);
    });
  });

  it("both members frame the same month", async () => {
    if (memberCount < 2) return;
    // Household day 25, member rows deliberately disagreeing at 1 and 15.
    await withHouseholdFixture(
      {
        memberCount,
        budgetMonthStartDay: 25,
        memberStartDays: Array.from({ length: memberCount }, (_, i) => (i === 0 ? 1 : 15)),
      },
      async ({ users }) => {
        const keys = await Promise.all(
          users.map((u) => getDefaultBudgetMonthForUser(u.id))
        );
        expect(new Set(keys).size).toBe(1);

        // And a spend dated the 20th lands in the same month for everyone --
        // day 25 puts it in the *next* month key, which is exactly the
        // difference the per-user columns above would have produced.
        const onThe20th = await Promise.all(
          users.map((u) => budgetMonthKeyForUser(u.id, `${keys[0]}-20`))
        );
        expect(new Set(onThe20th).size).toBe(1);
      }
    );
  });

  it("shows a partner rows on a shared account", async () => {
    if (memberCount < 2) return;
    await withHouseholdFixture({ memberCount }, async ({ users, month, categories, svc }) => {
      const [owner, partner] = users;
      const accountService = new AccountService();
      const { id } = await accountService.createAccount(owner.id, {
        name: "Joint",
        type: "bank",
        isShared: true,
      });
      // The flag has to survive the service, or the rest of this is untestable.
      expect((await getAccountRepository().findById(id, owner.id))?.isShared).toBe(true);

      await svc.expense.create(owner.id, {
        categoryId: categories[0].id,
        amount: 12_500,
        date: `${month}-11`,
        accountId: id,
      });

      // The partner sees the row...
      const rows = await svc.expense.getByMonth(month, partner.id, undefined, true);
      expect(rows.expenses.some((e) => e.accountId === id)).toBe(true);

      // ...and can now see the account itself, which is what makes it
      // selectable when they file a spend.
      const visible = await accountService.listAccountsVisibleToUser(partner.id);
      expect(visible.accounts.some((a) => a.id === id)).toBe(true);
      // Ownership is unchanged: it is not theirs to rename or delete.
      const owned = await accountService.listAccountsForUser(partner.id);
      expect(owned.accounts.some((a) => a.id === id)).toBe(false);
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
