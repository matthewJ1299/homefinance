import { describe, it, expect, vi, beforeEach } from "vitest";
import { BudgetService } from "./budget.service";
import { SummaryService } from "./summary.service";

/**
 * Unit tests for budget and summary calculation logic.
 * Repositories are mocked so we only assert on formulas: balance, remaining, unallocated, adherence, etc.
 */

vi.mock("@/lib/repositories", () => ({
  getBudgetRepository: vi.fn(),
  getCategoryRepository: vi.fn(),
  getIncomeRepository: vi.fn(),
  getExpenseRepository: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  all: vi.fn().mockResolvedValue([]),
}));

describe("budget calculations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("balance = totalIncome - totalExpenses", async () => {
    const { getBudgetRepository, getCategoryRepository } = await import("@/lib/repositories");
    const { getIncomeRepository } = await import("@/lib/repositories");
    const { ExpenseService } = await import("./expense.service");

    vi.mocked(getCategoryRepository).mockReturnValue({
      findAll: vi.fn().mockResolvedValue([
        { id: 1, name: "Food", groupName: "Living", costType: "variable", defaultAmount: null },
      ]),
    } as never);

    vi.mocked(getIncomeRepository).mockReturnValue({
      findByMonth: vi.fn().mockResolvedValue([
        { userId: 1, amount: 20_000 },
      ]),
    } as never);

    vi.mocked(getBudgetRepository).mockReturnValue({
      getAllocationsForMonths: vi.fn().mockResolvedValue([]),
      getAllocationsForMonth: vi.fn().mockResolvedValue([]),
      getTransfersForMonth: vi.fn().mockResolvedValue([]),
      upsertAllocation: vi.fn().mockResolvedValue(undefined),
    } as never);

    vi.mocked(await import("@/lib/repositories")).getExpenseRepository = vi.fn().mockReturnValue({
      findByMonth: vi.fn().mockResolvedValue([
        { id: 1, userId: 1, categoryId: 1, amount: 12_000, date: "2024-03-01" },
      ]),
    }) as never;

    const budgetService = new BudgetService();
    const overview = await budgetService.getOverview("2024-03", 1);

    expect(overview.totalIncome).toBe(20_000);
    expect(overview.totalExpenses).toBe(12_000);
    expect(overview.balance).toBe(20_000 - 12_000);
  });

  it("remaining = allocated - spent per category", async () => {
    const { getBudgetRepository, getCategoryRepository } = await import("@/lib/repositories");

    vi.mocked(getCategoryRepository).mockReturnValue({
      findAll: vi.fn().mockResolvedValue([
        { id: 1, name: "Food", groupName: "Living", costType: "variable", defaultAmount: null },
      ]),
    } as never);

    vi.mocked(getBudgetRepository).mockReturnValue({
      getAllocationsForMonths: vi.fn().mockResolvedValue([
        { categoryId: 1, month: "2024-03", allocatedAmount: 5_000 },
      ]),
      getAllocationsForMonth: vi.fn().mockResolvedValue([
        { categoryId: 1, allocatedAmount: 5_000 },
      ]),
      getTransfersForMonth: vi.fn().mockResolvedValue([]),
      upsertAllocation: vi.fn().mockResolvedValue(undefined),
    } as never);

    const { getIncomeRepository, getExpenseRepository } = await import("@/lib/repositories");
    vi.mocked(getIncomeRepository).mockReturnValue({
      findByMonth: vi.fn().mockResolvedValue([{ userId: 1, amount: 10_000 }]),
    } as never);
    vi.mocked(getExpenseRepository).mockReturnValue({
      findByMonth: vi.fn().mockResolvedValue([
        { id: 1, userId: 1, categoryId: 1, amount: 3_000, date: "2024-03-01" },
      ]),
    } as never);

    const budgetService = new BudgetService();
    const overview = await budgetService.getOverview("2024-03", 1);

    const row = overview.categories[0];
    expect(row.allocated).toBe(5_000);
    expect(row.spent).toBe(3_000);
    expect(row.remaining).toBe(5_000 - 3_000);
    expect(row.isOverspent).toBe(false);
  });

  it("isOverspent is true when spent > allocated", async () => {
    const { getBudgetRepository, getCategoryRepository } = await import("@/lib/repositories");

    vi.mocked(getCategoryRepository).mockReturnValue({
      findAll: vi.fn().mockResolvedValue([
        { id: 1, name: "Food", groupName: "Living", costType: "variable", defaultAmount: null },
      ]),
    } as never);

    vi.mocked(getBudgetRepository).mockReturnValue({
      getAllocationsForMonths: vi.fn().mockResolvedValue([
        { categoryId: 1, month: "2024-03", allocatedAmount: 2_000 },
      ]),
      getAllocationsForMonth: vi.fn().mockResolvedValue([
        { categoryId: 1, allocatedAmount: 2_000 },
      ]),
      getTransfersForMonth: vi.fn().mockResolvedValue([]),
      upsertAllocation: vi.fn().mockResolvedValue(undefined),
    } as never);

    const { getIncomeRepository, getExpenseRepository } = await import("@/lib/repositories");
    vi.mocked(getIncomeRepository).mockReturnValue({
      findByMonth: vi.fn().mockResolvedValue([{ userId: 1, amount: 10_000 }]),
    } as never);
    vi.mocked(getExpenseRepository).mockReturnValue({
      findByMonth: vi.fn().mockResolvedValue([
        { id: 1, userId: 1, categoryId: 1, amount: 2_500, date: "2024-03-01" },
      ]),
    } as never);

    const budgetService = new BudgetService();
    const overview = await budgetService.getOverview("2024-03", 1);

    const row = overview.categories[0];
    expect(row.remaining).toBe(2_000 - 2_500);
    expect(row.isOverspent).toBe(true);
  });

  it("unallocated = totalIncome - totalAllocated", async () => {
    const { getBudgetRepository, getCategoryRepository } = await import("@/lib/repositories");

    vi.mocked(getCategoryRepository).mockReturnValue({
      findAll: vi.fn().mockResolvedValue([
        { id: 1, name: "Food", groupName: "Living", costType: "variable", defaultAmount: null },
        { id: 2, name: "Rent", groupName: "Living", costType: "fixed", defaultAmount: null },
      ]),
    } as never);

    vi.mocked(getBudgetRepository).mockReturnValue({
      getAllocationsForMonths: vi.fn().mockResolvedValue([
        { categoryId: 1, month: "2024-03", allocatedAmount: 3_000 },
        { categoryId: 2, month: "2024-03", allocatedAmount: 7_000 },
      ]),
      getAllocationsForMonth: vi.fn().mockResolvedValue([
        { categoryId: 1, allocatedAmount: 3_000 },
        { categoryId: 2, allocatedAmount: 7_000 },
      ]),
      getTransfersForMonth: vi.fn().mockResolvedValue([]),
      upsertAllocation: vi.fn().mockResolvedValue(undefined),
    } as never);

    const { getIncomeRepository, getExpenseRepository } = await import("@/lib/repositories");
    vi.mocked(getIncomeRepository).mockReturnValue({
      findByMonth: vi.fn().mockResolvedValue([{ userId: 1, amount: 15_000 }]),
    } as never);
    vi.mocked(getExpenseRepository).mockReturnValue({
      findByMonth: vi.fn().mockResolvedValue([]),
    } as never);

    const budgetService = new BudgetService();
    const overview = await budgetService.getOverview("2024-03", 1);

    expect(overview.totalAllocated).toBe(3_000 + 7_000);
    expect(overview.unallocated).toBe(15_000 - 10_000);
    expect(overview.isBalanced).toBe(false);
  });
});

describe("summary calculations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("netPosition = totalIncome - totalExpenses", async () => {
    const { getIncomeRepository, getBudgetRepository } = await import("@/lib/repositories");
    vi.mocked(getIncomeRepository).mockReturnValue({
      findByMonth: vi.fn().mockResolvedValue([
        { userId: 1, amount: 30_000 },
      ]),
    } as never);
    vi.mocked(getBudgetRepository).mockReturnValue({
      getAllocationsForMonth: vi.fn().mockResolvedValue([]),
    } as never);
    vi.mocked(await import("@/lib/repositories")).getExpenseRepository = vi.fn().mockReturnValue({
      findByMonth: vi.fn().mockResolvedValue([
        { id: 1, userId: 1, categoryId: 1, amount: 22_000, date: "2024-03-01" },
      ]),
    }) as never;

    const summaryService = new SummaryService();
    const snapshot = await summaryService.getMonthlySnapshot("2024-03", 1);

    expect(snapshot.totalIncome).toBe(30_000);
    expect(snapshot.totalExpenses).toBe(22_000);
    expect(snapshot.netPosition).toBe(30_000 - 22_000);
  });

  it("adherencePct = (spent / allocated) * 100 when allocated > 0", async () => {
    const { getIncomeRepository, getBudgetRepository } = await import("@/lib/repositories");
    vi.mocked(getIncomeRepository).mockReturnValue({
      findByMonth: vi.fn().mockResolvedValue([{ userId: 1, amount: 10_000 }]),
    } as never);
    vi.mocked(getBudgetRepository).mockReturnValue({
      getAllocationsForMonth: vi.fn().mockResolvedValue([
        { categoryId: 1, allocatedAmount: 4_000 },
      ]),
    } as never);
    vi.mocked(await import("@/lib/repositories")).getExpenseRepository = vi.fn().mockReturnValue({
      findByMonth: vi.fn().mockResolvedValue([
        { id: 1, userId: 1, categoryId: 1, amount: 3_000, date: "2024-03-01" },
      ]),
    }) as never;
    vi.mocked(await import("@/lib/repositories")).getCategoryRepository = vi.fn().mockReturnValue({
      findAll: vi.fn().mockResolvedValue([
        { id: 1, name: "Food", groupName: "Living", costType: "variable", defaultAmount: null },
      ]),
    }) as never;

    const summaryService = new SummaryService();
    const snapshot = await summaryService.getMonthlySnapshot("2024-03", 1);

    const adherence = snapshot.budgetAdherence.find((a) => a.categoryName === "Food");
    expect(adherence).toBeDefined();
    expect(adherence!.allocated).toBe(4_000);
    expect(adherence!.spent).toBe(3_000);
    expect(adherence!.adherencePct).toBe((3_000 / 4_000) * 100);
  });
});
