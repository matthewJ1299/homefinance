/**
 * The recon accept path writes expenses, so it has to obey the same split
 * rules as the Add sheet.
 *
 * Until `acceptAdd` took explicit shares, `split: true` meant "everyone in the
 * household, evenly" -- the exact behaviour Fix 4 retired from `QuickAddForm`.
 * It survived here because recon was never part of Phase 3.
 *
 * Requires DATABASE_URL and `npm run db:push`.
 */
import { describe, it, expect } from "vitest";
import { withHouseholdFixture } from "./helpers/fixture";
import { ReconService } from "@/lib/services/recon/recon.service";
import { getSplitAllocationRepository } from "@/lib/repositories";

const HAS_DB = Boolean(process.env.DATABASE_URL);

/** A pending row as the parsers would have written it. */
async function seedPendingItem(
  householdId: number,
  userId: number,
  amountMinor: number,
  txnDate: string,
  vendor = "Woolworths"
): Promise<number> {
  const { run, lastInsertId } = await import("@/lib/db");
  await run(
    `INSERT INTO recon_import_items
       (user_id, household_id, graph_message_id, status, parse_type, amount, txn_date,
        vendor, merchant_key_normalized, matched_expense_ids, suggested_category_id,
        raw_subject, raw_body_preview)
     VALUES (?, ?, ?, 'pending_add', 'type_a', ?, ?, ?, ?, NULL, NULL, NULL, NULL)`,
    [
      userId,
      householdId,
      `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      amountMinor,
      txnDate,
      vendor,
      vendor.toLowerCase(),
    ]
  );
  return lastInsertId();
}

describe.runIf(HAS_DB)("recon accept", () => {
  it("writes the explicit shares it was given", async () => {
    await withHouseholdFixture({ memberCount: 4 }, async ({ householdId, users, categories, month }) => {
      const [me, ...others] = users;
      const itemId = await seedPendingItem(householdId, me.id, 100_000, `${month}-12`);

      // 600 / 300 / 100 of a R1000 bill across three of the four members --
      // a shape the boolean could not express in either dimension.
      const shares = [
        { userId: me.id, shareMinor: 60_000 },
        { userId: others[0].id, shareMinor: 30_000 },
        { userId: others[1].id, shareMinor: 10_000 },
      ];
      const { expenseId } = await new ReconService().acceptAdd(
        me.id,
        itemId,
        categories[0].id,
        null,
        shares
      );
      expect(expenseId).toBeTruthy();

      const { all } = await import("@/lib/db");
      const rows = await all<{ user_id: number; share_minor: number }>(
        "SELECT user_id, share_minor FROM expense_participants WHERE expense_id = ? ORDER BY user_id",
        [expenseId!]
      );
      expect(rows).toHaveLength(3);
      expect(rows.reduce((s, r) => s + Number(r.share_minor), 0)).toBe(100_000);
      // The fourth member was not in on it and must not appear.
      expect(rows.some((r) => Number(r.user_id) === others[2].id)).toBe(false);

      // One debt row per other participant, none for the payer.
      const owed = (await getSplitAllocationRepository().findAllForBalance()).filter(
        (a) => a.paidByUserId === me.id
      );
      expect(owed.filter((a) => a.allocationUserId === me.id)).toHaveLength(0);
      expect(
        owed.filter((a) => a.allocationUserId === others[0].id && a.amount === 30_000)
      ).toHaveLength(1);
      expect(
        owed.filter((a) => a.allocationUserId === others[1].id && a.amount === 10_000)
      ).toHaveLength(1);
    });
  });

  it("rejects shares that do not add up", async () => {
    await withHouseholdFixture({ memberCount: 4 }, async ({ householdId, users, categories, month }) => {
      const [me, ...others] = users;
      const itemId = await seedPendingItem(householdId, me.id, 100_000, `${month}-13`);
      await expect(
        new ReconService().acceptAdd(me.id, itemId, categories[0].id, null, [
          { userId: me.id, shareMinor: 60_000 },
          { userId: others[0].id, shareMinor: 10_000 }, // R300 short
        ])
      ).rejects.toThrow(/add up/i);
    });
  });

  it("`true` still means everyone, evenly", async () => {
    await withHouseholdFixture({ memberCount: 4 }, async ({ householdId, users, categories, month }) => {
      const me = users[0];
      const itemId = await seedPendingItem(householdId, me.id, 100_000, `${month}-14`);
      const { expenseId } = await new ReconService().acceptAdd(
        me.id,
        itemId,
        categories[0].id,
        null,
        true
      );

      const { all } = await import("@/lib/db");
      const rows = await all<{ user_id: number; share_minor: number }>(
        "SELECT user_id, share_minor FROM expense_participants WHERE expense_id = ?",
        [expenseId!]
      );
      // Unchanged from before the signature widened: all four, 250 each.
      expect(rows).toHaveLength(4);
      expect(rows.every((r) => Number(r.share_minor) === 25_000)).toBe(true);
    });
  });
});
