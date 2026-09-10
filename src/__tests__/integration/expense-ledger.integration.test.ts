import { describe, expect, it } from "vitest";
import { withHouseholdFixture } from "./helpers/fixture";
import {
  getAccountRepository,
  getAccountTransactionRepository,
  getExpenseParticipantRepository,
  getSplitAllocationRepository,
} from "@/lib/repositories";

const HAS_DB = !!process.env.DATABASE_URL;
const describeDb = HAS_DB ? describe : describe.skip;

/**
 * Guardrails for the two things the expense write path used to get wrong:
 *
 *  1. Deleting a spend filed against an account left its `account_transactions`
 *     debit behind. The ledger IS the account balance, so every delete made that
 *     balance permanently wrong, and there was no delete path on the repository
 *     to fix it with.
 *  2. Creating a shared spend was four sequential writes with best-effort
 *     compensating deletes. A failure part-way left the payer's envelope moved
 *     and no debt recorded, and said nothing.
 */
describeDb("expense ledger and atomicity (integration)", () => {
  async function makeAccount(householdId: number, ownerUserId: number): Promise<number> {
    const { run, lastInsertId } = await import("@/lib/db");
    await run(
      `INSERT INTO accounts (name, type, owner_user_id, household_id)
       VALUES ('Fixture cheque', 'bank', ?, ?)`,
      [ownerUserId, householdId]
    );
    return lastInsertId();
  }

  it("deleting a spend removes its ledger row and restores the balance", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async (ctx) => {
      const txRepo = getAccountTransactionRepository();
      const accountId = await makeAccount(ctx.householdId, ctx.users[0].id);

      await txRepo.create({
        accountId,
        amount: 100_000,
        transactionType: "adjustment",
        note: "opening balance",
      });
      expect(await txRepo.getBalance(accountId)).toBe(100_000);

      const { id } = await ctx.svc.expense.create(ctx.users[0].id, {
        categoryId: ctx.categories[0].id,
        amount: 25_000,
        date: `${ctx.month}-05`,
        accountId,
      });
      expect(await txRepo.getBalance(accountId)).toBe(75_000);

      await ctx.svc.expense.delete(id);

      expect(await txRepo.getBalance(accountId)).toBe(100_000);
      const { all } = await import("@/lib/db");
      const leftover = await all<{ id: number }>(
        "SELECT id FROM account_transactions WHERE reference_type = 'expense' AND reference_id = ?",
        [id]
      );
      expect(leftover).toEqual([]);

      await getAccountRepository().delete(accountId, ctx.users[0].id);
    });
  });

  it("a shared spend lands whole, with participants and allocations", async () => {
    await withHouseholdFixture({ memberCount: 2 }, async (ctx) => {
      const [payer, other] = ctx.users;
      const { id } = await ctx.svc.expense.create(payer.id, {
        categoryId: ctx.categories[0].id,
        amount: 30_000,
        date: `${ctx.month}-06`,
        participants: [
          { userId: payer.id, shareMinor: 18_000 },
          { userId: other.id, shareMinor: 12_000 },
        ],
      });

      const participants = await getExpenseParticipantRepository().findByExpenseId(id);
      expect(participants).toHaveLength(2);

      const allocations = await getSplitAllocationRepository().findByExpenseId(id);
      // One row: the payer's own share is not a debt to themselves.
      expect(allocations).toHaveLength(1);
      expect(allocations[0]).toMatchObject({ userId: other.id, amount: 12_000 });

      await ctx.svc.expense.delete(id);
    });
  });

  it("rolls the whole spend back when a participant share is rejected", async () => {
    await withHouseholdFixture({ memberCount: 2 }, async (ctx) => {
      const [payer] = ctx.users;
      const { all } = await import("@/lib/db");
      const before = await all<{ c: string }>(
        "SELECT COUNT(*) AS c FROM expenses WHERE household_id = ?",
        [ctx.householdId]
      );

      await expect(
        ctx.svc.expense.create(payer.id, {
          categoryId: ctx.categories[0].id,
          amount: 30_000,
          date: `${ctx.month}-07`,
          // Shares that do not add up to the amount: rejected before any write.
          participants: [
            { userId: payer.id, shareMinor: 10_000 },
            { userId: 999_999_999, shareMinor: 20_000 },
          ],
        })
      ).rejects.toThrow();

      const after = await all<{ c: string }>(
        "SELECT COUNT(*) AS c FROM expenses WHERE household_id = ?",
        [ctx.householdId]
      );
      expect(after[0].c).toBe(before[0].c);
    });
  });

  it("keeps lastInsertId correct for chained inserts inside one transaction", async () => {
    // The transaction boundary added to ExpenseService.create broke this once:
    // `run` wrote the new id back with setRequestContext, which does not reach
    // the caller's already-suspended frame, so lastInsertId() saw nothing.
    await withHouseholdFixture({ memberCount: 2 }, async (ctx) => {
      const [payer, other] = ctx.users;
      const first = await ctx.svc.expense.create(payer.id, {
        categoryId: ctx.categories[0].id,
        amount: 10_000,
        date: `${ctx.month}-08`,
        participants: [
          { userId: payer.id, shareMinor: 5_000 },
          { userId: other.id, shareMinor: 5_000 },
        ],
      });
      const second = await ctx.svc.expense.create(payer.id, {
        categoryId: ctx.categories[1].id,
        amount: 20_000,
        date: `${ctx.month}-09`,
      });

      expect(first.id).toBeGreaterThan(0);
      expect(second.id).toBeGreaterThan(first.id);

      await ctx.svc.expense.delete(first.id);
      await ctx.svc.expense.delete(second.id);
    });
  });
});

describeDb("transaction nesting (integration)", () => {
  it("joins an open transaction instead of opening a second one", async () => {
    // BudgetAiApplyService wraps a loop that calls BudgetService.transfer, and
    // transfer opens its own transaction. Before withTransaction was re-entrant
    // the inner one took a second pooled client and committed independently, so
    // it survived a rollback of the outer.
    await withHouseholdFixture({ memberCount: 1 }, async (ctx) => {
      const { withTransaction, all } = await import("@/lib/db");
      const before = await all<{ c: string }>(
        "SELECT COUNT(*) AS c FROM expenses WHERE household_id = ?",
        [ctx.householdId]
      );

      await expect(
        withTransaction(async () => {
          // create() opens its own transaction; it must join this one.
          await ctx.svc.expense.create(ctx.users[0].id, {
            categoryId: ctx.categories[0].id,
            amount: 12_345,
            date: `${ctx.month}-11`,
          });
          throw new Error("roll the outer back");
        })
      ).rejects.toThrow("roll the outer back");

      const after = await all<{ c: string }>(
        "SELECT COUNT(*) AS c FROM expenses WHERE household_id = ?",
        [ctx.householdId]
      );
      // The inner write must have gone with the outer rollback.
      expect(after[0].c).toBe(before[0].c);
    });
  });
});

describeDb("income ledger (integration)", () => {
  async function makeAccount(householdId: number, ownerUserId: number): Promise<number> {
    const { run, lastInsertId } = await import("@/lib/db");
    await run(
      `INSERT INTO accounts (name, type, owner_user_id, household_id)
       VALUES ('Fixture income acct', 'bank', ?, ?)`,
      [ownerUserId, householdId]
    );
    return lastInsertId();
  }

  it("keeps the account balance right across create, edit and delete", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async (ctx) => {
      const { IncomeService } = await import("@/lib/services/income.service");
      const txRepo = getAccountTransactionRepository();
      const accountId = await makeAccount(ctx.householdId, ctx.users[0].id);
      const income = new IncomeService();

      const { id } = await income.create(ctx.users[0].id, {
        amount: 500_000,
        type: "salary",
        date: `${ctx.month}-01`,
        accountId,
      });
      expect(await txRepo.getBalance(accountId)).toBe(500_000);

      // Correcting the figure must move the ledger with it.
      await income.update(id, ctx.users[0].id, { amount: 450_000 });
      expect(await txRepo.getBalance(accountId)).toBe(450_000);

      // Deleting must take the credit with it, not leave the account inflated.
      await income.delete(id);
      expect(await txRepo.getBalance(accountId)).toBe(0);

      await getAccountRepository().delete(accountId, ctx.users[0].id);
    });
  });

  it("keeps the account balance right when a spend is edited", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async (ctx) => {
      const txRepo = getAccountTransactionRepository();
      const accountId = await makeAccount(ctx.householdId, ctx.users[0].id);
      await txRepo.create({
        accountId,
        amount: 100_000,
        transactionType: "adjustment",
        note: "opening",
      });

      const { id } = await ctx.svc.expense.create(ctx.users[0].id, {
        categoryId: ctx.categories[0].id,
        amount: 30_000,
        date: `${ctx.month}-04`,
        accountId,
      });
      expect(await txRepo.getBalance(accountId)).toBe(70_000);

      await ctx.svc.expense.update(id, ctx.users[0].id, { amount: 25_000 });
      expect(await txRepo.getBalance(accountId)).toBe(75_000);

      await ctx.svc.expense.delete(id);
      expect(await txRepo.getBalance(accountId)).toBe(100_000);

      await getAccountRepository().delete(accountId, ctx.users[0].id);
    });
  });

  it("a transfer moves money without creating or destroying any", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async (ctx) => {
      const { TransferService } = await import("@/lib/services/transfer.service");
      const txRepo = getAccountTransactionRepository();
      const a = await makeAccount(ctx.householdId, ctx.users[0].id);
      const b = await makeAccount(ctx.householdId, ctx.users[0].id);
      await txRepo.create({ accountId: a, amount: 200_000, transactionType: "adjustment" });

      await new TransferService().transferBetweenAccounts(ctx.users[0].id, {
        fromAccountId: a,
        toAccountId: b,
        amount: 75_000,
      });

      const balances = await txRepo.getBalances([a, b]);
      expect(balances.get(a)).toBe(125_000);
      expect(balances.get(b)).toBe(75_000);
      // Conservation: the household total is unchanged by a move.
      expect((balances.get(a) ?? 0) + (balances.get(b) ?? 0)).toBe(200_000);

    });
  });
});

describeDb("ledger integrity is enforced by the schema (integration)", () => {
  it("cascades the ledger row away even when nothing cleans it up", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async (ctx) => {
      const { run, all, lastInsertId } = await import("@/lib/db");
      await run(
        `INSERT INTO accounts (name, type, owner_user_id, household_id)
         VALUES ('Cascade acct', 'bank', ?, ?)`,
        [ctx.users[0].id, ctx.householdId]
      );
      const accountId = await lastInsertId();

      const { id } = await ctx.svc.expense.create(ctx.users[0].id, {
        categoryId: ctx.categories[0].id,
        amount: 12_000,
        date: `${ctx.month}-12`,
        accountId,
      });

      const typed = await all<{ expense_id: number }>(
        "SELECT expense_id FROM account_transactions WHERE expense_id = ?",
        [id]
      );
      expect(typed).toHaveLength(1);

      // Delete the expense DIRECTLY, bypassing the service that cleans up. Before
      // 0049 the ledger row survived and the balance stayed wrong forever; the
      // foreign key now removes it whether or not a call site remembers.
      await run("DELETE FROM expenses WHERE id = ?", [id]);

      const after = await all<{ id: number }>(
        "SELECT id FROM account_transactions WHERE expense_id = ?",
        [id]
      );
      expect(after).toEqual([]);
      expect(await getAccountTransactionRepository().getBalance(accountId)).toBe(0);
    });
  });

  it("refuses a cross-tenant category on an expense", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async (outer) => {
      await withHouseholdFixture({ memberCount: 1 }, async (inner) => {
        const { run } = await import("@/lib/db");
        // A category belonging to the OTHER household. Only application code
        // stopped this before; the composite FK makes it unrepresentable.
        await expect(
          run(
            `INSERT INTO expenses (user_id, household_id, category_id, amount, date, month)
             VALUES (?, ?, ?, 100, ?, ?)`,
            [
              inner.users[0].id,
              inner.householdId,
              outer.categories[0].id,
              `${inner.month}-03`,
              inner.month,
            ]
          )
        ).rejects.toThrow(/tenant_fk|foreign key/i);
      });
    });
  });

  it("refuses a malformed date and an out-of-range month start day", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async (ctx) => {
      const { run } = await import("@/lib/db");
      await expect(
        run(
          `INSERT INTO expenses (user_id, household_id, category_id, amount, date, month)
           VALUES (?, ?, ?, 100, '01/03/2026', ?)`,
          [ctx.users[0].id, ctx.householdId, ctx.categories[0].id, ctx.month]
        )
      ).rejects.toThrow(/date_format/i);

      await expect(
        run("UPDATE households SET budget_month_start_day = 31 WHERE id = ?", [ctx.householdId])
      ).rejects.toThrow(/start_day/i);
    });
  });
});
