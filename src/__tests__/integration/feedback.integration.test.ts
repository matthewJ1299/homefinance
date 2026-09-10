import { describe, expect, it } from "vitest";
import { withHouseholdFixture } from "./helpers/fixture";
import { FeedbackService } from "@/lib/services/feedback.service";
import { getFeedbackRepository } from "@/lib/repositories";

const HAS_DB = !!process.env.DATABASE_URL;
const describeDb = HAS_DB ? describe : describe.skip;

/**
 * The feedback inbox is the one place in the app that reads across households,
 * so its guardrails are about privilege rather than tenant scope.
 */
describeDb("feedback (integration)", () => {
  /** The admin reads are super-admin gated; the fixture's user is not one. */
  async function asSuperAdmin<T>(userId: number, fn: () => Promise<T>): Promise<T> {
    const { getRequestContext, setRequestContext } = await import("@/lib/db/request-context");
    const prev = getRequestContext();
    setRequestContext({ ...prev, isSuperAdmin: true });
    try {
      return await fn();
    } finally {
      setRequestContext({ ...prev, isSuperAdmin: false });
    }
  }

  it("stores the report with who, what, and where", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async (ctx) => {
      const service = new FeedbackService();
      await service.submit({
        userId: ctx.users[0].id,
        body: "  The total looks wrong.  ",
        attemptedAction: "  Save a spend  ",
        pathname: "/budget",
        errorMessage: null,
        source: "menu",
      });

      const { all } = await import("@/lib/db");
      const rows = await all<{
        body: string;
        attempted_action: string;
        pathname: string;
        source: string;
        user_id: number;
        household_id: number;
      }>("SELECT body, attempted_action, pathname, source, user_id, household_id FROM feedback WHERE household_id = ?", [
        ctx.householdId,
      ]);

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        // Trimmed on the way in, so the NOT-EMPTY constraint and the validator
        // agree on what counts as blank.
        body: "The total looks wrong.",
        attempted_action: "Save a spend",
        pathname: "/budget",
        source: "menu",
        user_id: ctx.users[0].id,
        household_id: ctx.householdId,
      });
    });
  });

  it("keeps an empty report out of the database", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async (ctx) => {
      await expect(
        new FeedbackService().submit({
          userId: ctx.users[0].id,
          body: "   ",
          pathname: "/budget",
          source: "menu",
        })
      ).rejects.toThrow(/body_present|check constraint/i);
    });
  });

  it("counts everything as unread until the admin has looked", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async (ctx) => {
      const service = new FeedbackService();
      await service.submit({
        userId: ctx.users[0].id,
        body: "First",
        pathname: "/dashboard",
        source: "menu",
      });

      await asSuperAdmin(ctx.users[0].id, async () => {
        // Never opened: a null marker means all of it is new.
        expect(await service.unreadCountFor(ctx.users[0].id)).toBeGreaterThanOrEqual(1);

        // Opening reports the count as it was BEFORE the marker moved, so the
        // screen can say "1 new" on the visit that clears it rather than the
        // visit after.
        const opened = await service.openInbox(ctx.users[0].id);
        expect(opened.unreadCount).toBeGreaterThanOrEqual(1);
        expect(opened.items.some((i) => i.body === "First")).toBe(true);

        // ...and it is read from here on.
        expect(await service.unreadCountFor(ctx.users[0].id)).toBe(0);
      });
    });
  });

  it("refuses the cross-household read without super-admin", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async () => {
      // The fixture context is an ordinary household member.
      await expect(getFeedbackRepository().listAllForAdmin()).rejects.toThrow(/forbidden/i);
      await expect(getFeedbackRepository().countSinceForAdmin(null)).rejects.toThrow(/forbidden/i);
    });
  });
});
