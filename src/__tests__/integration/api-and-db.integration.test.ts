/**
 * Integration tests: hit API route handlers and DB, then restore state.
 * Requires DATABASE_URL and a seeded DB (npm run db:fresh). Skips when DATABASE_URL is unset.
 * Restores state by deleting created entities in afterEach.
 */
import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";

const HAS_DB = Boolean(process.env.DATABASE_URL);

// The route handlers bind tenant context from the session, so the mock has to
// carry a household and its entitlements. Without them every tenant-scoped
// query throws "Missing household context" and every gated route answers 403 --
// which is what this suite had been doing since households landed.
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: {
      id: "1",
      name: "Test User",
      // Replaced in beforeAll with the seeded user's real household.
      householdId: "0",
      featureKeys: ["ai_budget_analysis", "recon", "what_i_owe", "mortgage", "goals"],
      aiTier: "free",
      householdApprovalStatus: "active",
      isSuperAdmin: false,
      mustChangePassword: false,
    },
  }),
}));

describe.runIf(HAS_DB)("API and DB integration", () => {
  const createdExpenseIds: number[] = [];
  const createdIncomeIds: number[] = [];
  const createdBudgetSnapshots: { userId: number; categoryId: number; month: string; amount: number }[] = [];
  let householdId = 0;
  let seedUserId = 0;
  let seedCategoryId = 0;

  beforeAll(async () => {
    const { initDb, get } = await import("@/lib/db");
    await initDb();

    // Ids are not stable across reseeds -- `db:seed` deletes rows but leaves the
    // sequences where they are, so the seeded user is only id 1 immediately
    // after a schema drop. Look the seeded household up by the email the seed
    // does guarantee, and take a category from it, rather than hardcoding ids
    // that a second reseed silently invalidates.
    const row = await get<{ id: number; household_id: number }>(
      `SELECT id, household_id FROM users
       WHERE email = 'matt@homefinance.local' AND household_id IS NOT NULL
       ORDER BY id LIMIT 1`
    );
    if (row?.household_id == null) {
      throw new Error("No seeded user with a household. Run npm run db:fresh.");
    }
    seedUserId = Number(row.id);
    householdId = Number(row.household_id);

    const cat = await get<{ id: number }>(
      "SELECT id FROM categories WHERE household_id = $1 ORDER BY id LIMIT 1",
      [householdId]
    );
    if (cat?.id == null) {
      throw new Error("Seeded household has no categories. Run npm run db:fresh.");
    }
    seedCategoryId = Number(cat.id);
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: String(seedUserId),
        name: "Test User",
        householdId: String(row.household_id),
        featureKeys: ["ai_budget_analysis", "recon", "what_i_owe", "mortgage", "goals"],
        aiTier: "free",
        householdApprovalStatus: "active",
        isSuperAdmin: false,
        mustChangePassword: false,
      },
    } as never);
  });

  afterEach(async () => {
    const { run } = await import("@/lib/db");
    for (const id of createdExpenseIds) {
      await run("DELETE FROM expenses WHERE id = ?", [id]);
    }
    createdExpenseIds.length = 0;
    for (const id of createdIncomeIds) {
      await run("DELETE FROM income WHERE id = ?", [id]);
    }
    createdIncomeIds.length = 0;
    const { getBudgetRepository } = await import("@/lib/repositories");
    const budgetRepo = getBudgetRepository();
    for (const s of createdBudgetSnapshots) {
      if (s.amount > 0) {
        await budgetRepo.upsertAllocation(s.categoryId, s.month, s.amount, s.userId);
      } else {
        await run(
          "DELETE FROM budgets WHERE user_id = ? AND category_id = ? AND month = ?",
          [s.userId, s.categoryId, s.month]
        );
      }
    }
    createdBudgetSnapshots.length = 0;
  });

  describe("GET /api/categories", () => {
    it("returns categories", async () => {
      const { GET } = await import("@/app/api/categories/route");
      // This handler takes no request argument.
      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("categories");
      expect(Array.isArray(data.categories)).toBe(true);
    });
  });

  describe("GET /api/budget", () => {
    it("returns budget overview", async () => {
      const { GET } = await import("@/app/api/budget/route");
      const req = new NextRequest("http://localhost/api/budget?month=2024-03");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("month");
      expect(data).toHaveProperty("totalIncome");
      expect(data).toHaveProperty("totalExpenses");
      expect(data).toHaveProperty("balance");
      expect(data).toHaveProperty("categories");
      expect(data.balance).toBe(data.totalIncome - data.totalExpenses);
    });
  });

  describe("GET /api/expenses", () => {
    it("returns expenses for month", async () => {
      const { GET } = await import("@/app/api/expenses/route");
      const req = new NextRequest("http://localhost/api/expenses?month=2024-03");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("expenses");
      expect(data).toHaveProperty("totals");
      expect(data.totals).toHaveProperty("overall");
      expect(data.totals).toHaveProperty("byCategory");
    });
  });

  describe("POST /api/expenses and cleanup", () => {
    it("creates expense and response has id", async () => {
      const { POST } = await import("@/app/api/expenses/route");
      const req = new NextRequest("http://localhost/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          categoryId: seedCategoryId,
          amount: 5000,
          date: "2024-03-15",
          note: "Integration test",
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("id");
      expect(typeof data.id).toBe("number");
      createdExpenseIds.push(data.id);
    });
  });

  describe("GET /api/income", () => {
    it("returns income for month", async () => {
      const { GET } = await import("@/app/api/income/route");
      const req = new NextRequest("http://localhost/api/income?month=2024-03");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("entries");
      expect(data).toHaveProperty("totals");
      expect(data.totals).toHaveProperty("overall");
    });
  });

  describe("POST /api/income and cleanup", () => {
    it("creates income and response has id", async () => {
      const { POST } = await import("@/app/api/income/route");
      const req = new NextRequest("http://localhost/api/income", {
        method: "POST",
        body: JSON.stringify({
          amount: 10000,
          type: "ad_hoc",
          date: "2024-03-20",
          description: "Integration test",
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("id");
      createdIncomeIds.push(data.id);
    });
  });

  describe("GET /api/summary", () => {
    it("returns monthly snapshot", async () => {
      const { GET } = await import("@/app/api/summary/route");
      const req = new NextRequest("http://localhost/api/summary?month=2024-03");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("month");
      expect(data).toHaveProperty("totalIncome");
      expect(data).toHaveProperty("totalExpenses");
      expect(data).toHaveProperty("netPosition");
      expect(data.netPosition).toBe(data.totalIncome - data.totalExpenses);
    });
  });

  describe("GET /api/summary/trends", () => {
    it("returns trends when from and to provided", async () => {
      const { GET } = await import("@/app/api/summary/trends/route");
      const req = new NextRequest("http://localhost/api/summary/trends?from=2024-01&to=2024-03");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("months");
      expect(Array.isArray(data.months)).toBe(true);
    });

    it("returns 400 when from or to missing", async () => {
      const { GET } = await import("@/app/api/summary/trends/route");
      const req = new NextRequest("http://localhost/api/summary/trends");
      const res = await GET(req);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/budget/allocate and cleanup", () => {
    it("sets allocation and returns overview", async () => {
      const { getBudgetRepository } = await import("@/lib/repositories");
      const repo = getBudgetRepository();
      const before = await repo.getAllocationsForMonth("2024-04", seedUserId);
      const catId = seedCategoryId;

      const { POST } = await import("@/app/api/budget/allocate/route");
      const req = new NextRequest("http://localhost/api/budget/allocate", {
        method: "POST",
        body: JSON.stringify({ categoryId: catId, month: "2024-04", amount: 3000 }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.month).toBe("2024-04");

      const prev = before.find((a) => a.categoryId === catId);
      createdBudgetSnapshots.push({ userId: seedUserId, categoryId: catId, month: "2024-04", amount: prev?.allocatedAmount ?? 0 });
    });
  });

  describe("GET /api/mortgage/config", () => {
    it("returns config or 404", async () => {
      const { GET } = await import("@/app/api/mortgage/config/route");
      const res = await GET();
      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        const data = await res.json();
        expect(data).toBeDefined();
      }
    });
  });

  describe("GET /api/mortgage/schedule", () => {
    it("returns schedule or 404", async () => {
      const { GET } = await import("@/app/api/mortgage/schedule/route");
      const res = await GET();
      expect([200, 404]).toContain(res.status);
    });
  });

  describe("GET /api/mortgage/equity", () => {
    it("returns equity or 404", async () => {
      const { GET } = await import("@/app/api/mortgage/equity/route");
      const res = await GET();
      expect([200, 404]).toContain(res.status);
    });
  });

  describe("Unauthorized", () => {
    it("returns 401 when auth is missing", async () => {
      vi.mocked(await import("@/lib/auth")).auth.mockResolvedValueOnce(null as never);
      const { GET } = await import("@/app/api/categories/route");
      // This handler takes no request argument.
      const res = await GET();
      expect(res.status).toBe(401);
      vi.mocked(await import("@/lib/auth")).auth.mockResolvedValue({
        user: { id: String(seedUserId), name: "Test User", householdId: String(householdId) },
      } as never);
    });
  });
});
