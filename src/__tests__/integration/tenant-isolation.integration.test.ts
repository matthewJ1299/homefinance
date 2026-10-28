/**
 * Tenant isolation: repositories bound to household A must not return rows from household B,
 * and must fail closed without household context.
 *
 * Requires DATABASE_URL and `npm run db:push`. Creates ephemeral households and cleans up after.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const HAS_DB = Boolean(process.env.DATABASE_URL);

describe.runIf(HAS_DB)("tenant isolation", () => {
  let householdAId: number;
  let householdBId: number;
  const categoryAName = `__tenant_test_a_${Date.now()}`;
  const categoryBName = `__tenant_test_b_${Date.now()}`;

  beforeAll(async () => {
    const { initDb, run, lastInsertId } = await import("@/lib/db");
    await initDb();

    await run("INSERT INTO households (name, approval_status) VALUES (?, 'active')", [
      "Tenant test A",
    ]);
    householdAId = await lastInsertId();

    await run("INSERT INTO households (name, approval_status) VALUES (?, 'active')", [
      "Tenant test B",
    ]);
    householdBId = await lastInsertId();

    await run(
      `INSERT INTO categories (name, group_name, household_id, is_active, sort_order, cost_type)
       VALUES (?, 'Test', ?, true, 0, 'variable')`,
      [categoryAName, householdAId]
    );
    await run(
      `INSERT INTO categories (name, group_name, household_id, is_active, sort_order, cost_type)
       VALUES (?, 'Test', ?, true, 0, 'variable')`,
      [categoryBName, householdBId]
    );
  });

  afterAll(async () => {
    const { run } = await import("@/lib/db");
    await run("DELETE FROM categories WHERE name IN (?, ?)", [categoryAName, categoryBName]);
    await run("DELETE FROM households WHERE id IN (?, ?)", [householdAId, householdBId]);
  });

  it("returns only household A categories when context is A", async () => {
    const { runWithRequestContext } = await import("@/lib/db/request-context");
    const { getCategoryRepository } = await import("@/lib/repositories");

    const names = await runWithRequestContext({ householdId: householdAId }, async () => {
      const rows = await getCategoryRepository().findAllIncludingInactive();
      return rows.map((c) => c.name);
    });

    expect(names).toContain(categoryAName);
    expect(names).not.toContain(categoryBName);
  });

  it("returns only household B categories when context is B", async () => {
    const { runWithRequestContext } = await import("@/lib/db/request-context");
    const { getCategoryRepository } = await import("@/lib/repositories");

    const names = await runWithRequestContext({ householdId: householdBId }, async () => {
      const rows = await getCategoryRepository().findAllIncludingInactive();
      return rows.map((c) => c.name);
    });

    expect(names).toContain(categoryBName);
    expect(names).not.toContain(categoryAName);
  });

  it("requireHouseholdId throws without context", async () => {
    const { requireHouseholdId, runWithRequestContext } = await import("@/lib/db/request-context");

    expect(() => requireHouseholdId()).toThrow(/Missing household context/);

    await runWithRequestContext({}, () => {
      expect(() => requireHouseholdId()).toThrow(/Missing household context/);
    });
  });
});
