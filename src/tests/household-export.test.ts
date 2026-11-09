import { describe, expect, it, vi } from "vitest";
import {
  budgetMonthWindows,
  exportFilename,
  lastBudgetMonthKeys,
  spanOfWindows,
} from "@/lib/services/household-export/periods";
import {
  appDateOf,
  money,
  shapeHouseholdExport,
  toIsoTimestamp,
  type ShapeHouseholdExportInput,
} from "@/lib/services/household-export/shape";

vi.mock("@/lib/utils/budget-month-for-user", () => ({
  budgetMonthStartDayForUser: vi.fn().mockResolvedValue(25),
  getDefaultBudgetMonthForUser: vi.fn().mockResolvedValue("2025-11"),
}));

describe("household export periods", () => {
  it("lists the current budget month and the ones before it, oldest first", () => {
    expect(lastBudgetMonthKeys("2025-11", 3)).toEqual(["2025-09", "2025-10", "2025-11"]);
  });

  it("walks back across a year boundary", () => {
    expect(lastBudgetMonthKeys("2026-01", 3)).toEqual(["2025-11", "2025-12", "2026-01"]);
  });

  it("returns nothing for a non-positive count", () => {
    expect(lastBudgetMonthKeys("2025-11", 0)).toEqual([]);
  });

  it("derives budget-month windows from the household start day, not calendar months", () => {
    const windows = budgetMonthWindows(["2025-10", "2025-11"], 25);
    expect(windows).toEqual([
      { key: "2025-10", label: "25 Oct - 24 Nov 2025", start: "2025-10-25", end: "2025-11-24" },
      { key: "2025-11", label: "25 Nov - 24 Dec 2025", start: "2025-11-25", end: "2025-12-24" },
    ]);
  });

  it("falls back to calendar months when the start day is 1", () => {
    expect(budgetMonthWindows(["2025-02"], 1)[0]).toMatchObject({
      start: "2025-02-01",
      end: "2025-02-28",
    });
  });

  it("spans the earliest start to the latest end, and names the file after it", () => {
    const windows = budgetMonthWindows(lastBudgetMonthKeys("2025-11", 3), 25);
    const span = spanOfWindows(windows);
    expect(span).toEqual({ start: "2025-09-25", end: "2025-12-24" });
    expect(exportFilename(span)).toBe("homefinance-export-2025-09-25-to-2025-12-24.json");
  });

  it("refuses to span zero windows", () => {
    expect(() => spanOfWindows([])).toThrow();
  });
});

describe("household export money and timestamps", () => {
  it("gives cents, rands and a display string", () => {
    expect(money(123456)).toEqual({
      minorUnits: 123456,
      rands: 1234.56,
      display: expect.stringContaining("1"),
    });
    expect(money(123456).display.replace(/\s/g, "")).toBe("R1234,56");
    expect(money(-500).rands).toBe(-5);
  });

  it("normalises Date and string created_at values to ISO", () => {
    const d = new Date("2025-10-03T07:15:00.000Z");
    expect(toIsoTimestamp(d)).toBe("2025-10-03T07:15:00.000Z");
    expect(toIsoTimestamp("2025-10-03T07:15:00.000Z")).toBe("2025-10-03T07:15:00.000Z");
  });

  it("reads a timestamp's calendar date in app time, not UTC", () => {
    // 22:30 UTC is 00:30 the next day in Johannesburg.
    expect(appDateOf(new Date("2025-10-03T22:30:00.000Z"))).toBe("2025-10-04");
  });
});

function baseInput(overrides: Partial<ShapeHouseholdExportInput> = {}): ShapeHouseholdExportInput {
  const budgetMonths = budgetMonthWindows(["2025-09", "2025-10", "2025-11"], 25);
  return {
    generatedAt: new Date("2025-11-09T10:00:00.000Z"),
    household: { id: 7, name: "The Jordaans" },
    exportedBy: { id: 1, name: "Matt" },
    budgetMonthStartDay: 25,
    budgetMonths,
    members: [
      { id: 1, name: "Matt" },
      { id: 2, name: "Sam" },
    ],
    categories: [
      {
        id: 10,
        name: "Groceries",
        groupName: "Living",
        icon: null,
        sortOrder: 1,
        isActive: true,
        costType: "variable",
        defaultAmount: null,
        rollover: false,
        targetMinor: null,
        targetDate: null,
        semanticKey: null,
      },
      {
        id: 11,
        name: "Shared",
        groupName: "Household",
        icon: null,
        sortOrder: 2,
        isActive: true,
        costType: "variable",
        defaultAmount: null,
        rollover: false,
        targetMinor: null,
        targetDate: null,
        semanticKey: "splits",
      },
    ],
    accounts: [
      {
        id: 100,
        name: "Cheque",
        type: "bank",
        ownerUserId: 1,
        creditLimit: null,
        isShared: false,
        createdAt: "2025-01-01T00:00:00.000Z",
      },
      {
        id: 101,
        name: "Joint savings",
        type: "savings",
        ownerUserId: 2,
        creditLimit: null,
        isShared: true,
        createdAt: "2025-01-01T00:00:00.000Z",
      },
    ],
    expenses: [],
    participants: [],
    income: [],
    transfers: [],
    ledger: [],
    settlements: [],
    ...overrides,
  };
}

describe("shapeHouseholdExport", () => {
  it("writes a self-describing meta block", () => {
    const out = shapeHouseholdExport(baseInput());
    expect(out.meta).toMatchObject({
      format: "homefinance-household-export",
      version: 1,
      generatedAt: "2025-11-09T10:00:00.000Z",
      currency: "ZAR",
      household: { id: 7, name: "The Jordaans" },
      exportedBy: { id: 1, name: "Matt" },
      budgetMonthStartDay: 25,
      range: { start: "2025-09-25", end: "2025-12-24" },
    });
    expect(out.meta.budgetMonths.map((m) => m.key)).toEqual(["2025-09", "2025-10", "2025-11"]);
    expect(out.meta.notes.length).toBeGreaterThan(0);
    expect(out.meta.counts).toEqual({
      members: 2,
      categories: 2,
      accounts: 2,
      expenses: 0,
      income: 0,
      transfers: 0,
      settlements: 0,
      ledger: 0,
    });
  });

  it("puts names next to ids on reference data", () => {
    const out = shapeHouseholdExport(baseInput());
    expect(out.members).toEqual([
      { id: 1, name: "Matt" },
      { id: 2, name: "Sam" },
    ]);
    expect(out.categories[1]).toEqual({
      id: 11,
      name: "Shared",
      group: "Household",
      semanticKey: "splits",
      costType: "variable",
      isActive: true,
    });
    expect(out.accounts[1]).toMatchObject({
      id: 101,
      name: "Joint savings",
      type: "savings",
      owner: { id: 2, name: "Sam" },
      isShared: true,
      creditLimit: null,
    });
  });

  it("assigns expenses to budget months by the start day and labels every id", () => {
    const out = shapeHouseholdExport(
      baseInput({
        expenses: [
          {
            id: 500,
            userId: 1,
            userName: "Matt",
            categoryId: 10,
            categoryName: "Groceries",
            amount: 45099,
            note: "Weekly shop",
            date: "2025-10-24",
            month: "2025-09",
            createdAt: "2025-10-24T15:00:00.000Z",
            accountId: 100,
          },
          {
            id: 501,
            userId: 1,
            userName: "Matt",
            categoryId: 10,
            categoryName: "Groceries",
            amount: 1000,
            note: null,
            date: "2025-10-25",
            month: "2025-10",
            createdAt: "2025-10-25T15:00:00.000Z",
            accountId: null,
          },
        ],
      })
    );
    expect(out.expenses[0]).toMatchObject({
      id: 500,
      date: "2025-10-24",
      budgetMonth: "2025-09",
      amount: { minorUnits: 45099, rands: 450.99 },
      category: { id: 10, name: "Groceries", group: "Living", semanticKey: null },
      note: "Weekly shop",
      account: { id: 100, name: "Cheque" },
      enteredBy: { id: 1, name: "Matt" },
      paidBy: null,
      isSplit: false,
      participants: [],
    });
    expect(out.expenses[1]).toMatchObject({ budgetMonth: "2025-10", account: null });
  });

  it("attaches each participant's share to a split spend and names the payer", () => {
    const out = shapeHouseholdExport(
      baseInput({
        expenses: [
          {
            id: 600,
            userId: 1,
            userName: "Matt",
            categoryId: 11,
            categoryName: "Shared",
            amount: 30000,
            note: "Dinner",
            date: "2025-11-01",
            month: "2025-10",
            createdAt: "2025-11-01T18:00:00.000Z",
            paidByUserId: 2,
            splitExpenseGroupId: 3,
            splitGroupId: "abc",
          },
        ],
        participants: [
          { id: 1, expenseId: 600, userId: 1, shareMinor: 15000, userName: "Matt" },
          { id: 2, expenseId: 600, userId: 2, shareMinor: 15000, userName: "Sam" },
          // A row for another expense must not leak in.
          { id: 3, expenseId: 601, userId: 2, shareMinor: 999, userName: "Sam" },
        ],
      })
    );
    expect(out.expenses).toHaveLength(1);
    expect(out.expenses[0]).toMatchObject({
      isSplit: true,
      paidBy: { id: 2, name: "Sam" },
      splitGroupId: "abc",
      splitExpenseGroupId: 3,
      participants: [
        { user: { id: 1, name: "Matt" }, share: { minorUnits: 15000, rands: 150 } },
        { user: { id: 2, name: "Sam" }, share: { minorUnits: 15000, rands: 150 } },
      ],
    });
  });

  it("treats a single participant who is not the payer as split", () => {
    const out = shapeHouseholdExport(
      baseInput({
        expenses: [
          {
            id: 700,
            userId: 1,
            userName: "Matt",
            categoryId: 11,
            categoryName: "Shared",
            amount: 5000,
            note: null,
            date: "2025-11-02",
            month: "2025-10",
            createdAt: "2025-11-02T18:00:00.000Z",
          },
        ],
        participants: [{ id: 9, expenseId: 700, userId: 2, shareMinor: 5000, userName: "Sam" }],
      })
    );
    expect(out.expenses[0].isSplit).toBe(true);
  });

  it("shapes income with type, kind, account and recipient", () => {
    const out = shapeHouseholdExport(
      baseInput({
        income: [
          {
            id: 800,
            userId: 2,
            userName: "Sam",
            amount: 2500000,
            type: "salary",
            incomeKind: "salary",
            description: "November pay",
            date: "2025-11-25",
            month: "2025-11",
            accountId: 101,
            createdAt: new Date("2025-11-25T06:00:00.000Z") as unknown as string,
          },
        ],
      })
    );
    expect(out.income[0]).toEqual({
      id: 800,
      date: "2025-11-25",
      budgetMonth: "2025-11",
      amount: money(2500000),
      type: "salary",
      kind: "salary",
      description: "November pay",
      account: { id: 101, name: "Joint savings" },
      receivedBy: { id: 2, name: "Sam" },
      createdAt: "2025-11-25T06:00:00.000Z",
    });
  });

  it("dates transfers by their app-time creation day and names both accounts", () => {
    const out = shapeHouseholdExport(
      baseInput({
        transfers: [
          {
            id: 900,
            fromAccountId: 100,
            toAccountId: 101,
            amount: 100000,
            note: "Savings top-up",
            // 23:00 UTC on the 24th is 01:00 on the 25th in Johannesburg: new budget month.
            createdAt: new Date("2025-10-24T23:00:00.000Z") as unknown as string,
          },
        ],
      })
    );
    expect(out.transfers[0]).toMatchObject({
      date: "2025-10-25",
      budgetMonth: "2025-10",
      amount: { minorUnits: 100000, rands: 1000 },
      from: { id: 100, name: "Cheque" },
      to: { id: 101, name: "Joint savings" },
      note: "Savings top-up",
      createdAt: "2025-10-24T23:00:00.000Z",
    });
  });

  it("shapes ledger rows with the account name and the source that raised them", () => {
    const out = shapeHouseholdExport(
      baseInput({
        ledger: [
          {
            id: 1,
            accountId: 100,
            amount: -45099,
            transactionType: "expense",
            referenceType: "expense",
            referenceId: 500,
            note: null,
            createdAt: "2025-10-24T15:00:00.000Z",
            effectiveDate: "2025-10-24",
          },
          {
            id: 2,
            accountId: 100,
            amount: 250,
            transactionType: "adjustment",
            note: "Interest",
            createdAt: "2025-11-01T00:00:00.000Z",
            effectiveDate: "2025-11-01",
          },
        ],
      })
    );
    expect(out.ledger[0]).toMatchObject({
      date: "2025-10-24",
      budgetMonth: "2025-09",
      account: { id: 100, name: "Cheque" },
      amount: { minorUnits: -45099, rands: -450.99 },
      transactionType: "expense",
      source: { type: "expense", id: 500 },
    });
    expect(out.ledger[1]).toMatchObject({ source: null, note: "Interest", budgetMonth: "2025-10" });
  });

  it("shapes settlements between members", () => {
    const out = shapeHouseholdExport(
      baseInput({
        settlements: [
          {
            id: 50,
            payerUserId: 1,
            recipientUserId: 2,
            payerUserName: "Matt",
            recipientUserName: "Sam",
            amount: 15000,
            date: "2025-11-05",
            expenseId: null,
            incomeId: 42,
            splitExpenseGroupId: 3,
          },
        ],
      })
    );
    expect(out.settlements[0]).toEqual({
      id: 50,
      date: "2025-11-05",
      budgetMonth: "2025-10",
      amount: money(15000),
      payer: { id: 1, name: "Matt" },
      recipient: { id: 2, name: "Sam" },
      expenseId: null,
      incomeId: 42,
      splitExpenseGroupId: 3,
    });
  });

  it("falls back to a labelled placeholder when a referenced row is missing", () => {
    const out = shapeHouseholdExport(
      baseInput({
        expenses: [
          {
            id: 1,
            userId: 99,
            userName: "",
            categoryId: 999,
            categoryName: "Old category",
            amount: 100,
            note: null,
            date: "2025-11-01",
            month: "2025-10",
            createdAt: "2025-11-01T00:00:00.000Z",
            accountId: 555,
          },
        ],
      })
    );
    expect(out.expenses[0]).toMatchObject({
      enteredBy: { id: 99, name: "Member 99" },
      category: { id: 999, name: "Old category", group: null, semanticKey: null },
      account: { id: 555, name: "Account 555" },
    });
  });

  it("summarises each budget month from the shaped rows", () => {
    const expense = (id: number, date: string, amount: number, categoryId: number, categoryName: string) => ({
      id,
      userId: 1,
      userName: "Matt",
      categoryId,
      categoryName,
      amount,
      note: null,
      date,
      month: "x",
      createdAt: "2025-01-01T00:00:00.000Z",
    });
    const out = shapeHouseholdExport(
      baseInput({
        expenses: [
          expense(1, "2025-09-30", 1000, 10, "Groceries"),
          expense(2, "2025-10-20", 2000, 10, "Groceries"),
          expense(3, "2025-10-24", 7000, 11, "Shared"),
          expense(4, "2025-10-25", 500, 10, "Groceries"),
        ],
        income: [
          {
            id: 1,
            userId: 1,
            userName: "Matt",
            amount: 20000,
            type: "salary",
            incomeKind: "salary",
            description: null,
            date: "2025-09-25",
            month: "2025-09",
            createdAt: "2025-09-25T00:00:00.000Z",
          },
        ],
      })
    );
    expect(out.monthlySummary.map((m) => m.budgetMonth)).toEqual(["2025-09", "2025-10", "2025-11"]);
    const sept = out.monthlySummary[0];
    expect(sept).toMatchObject({
      label: "25 Sep - 24 Oct 2025",
      totalExpenses: { minorUnits: 10000, rands: 100 },
      totalIncome: { minorUnits: 20000 },
      net: { minorUnits: 10000 },
      expenseCount: 3,
      incomeCount: 1,
    });
    // Biggest category first.
    expect(sept.spendingByCategory.map((c) => [c.category.name, c.total.minorUnits, c.count])).toEqual([
      ["Shared", 7000, 1],
      ["Groceries", 3000, 2],
    ]);
    expect(out.monthlySummary[1]).toMatchObject({
      totalExpenses: { minorUnits: 500 },
      totalIncome: { minorUnits: 0 },
      net: { minorUnits: -500 },
    });
    expect(out.monthlySummary[2].expenseCount).toBe(0);
  });

  it("survives JSON round-tripping without losing a field", () => {
    const out = shapeHouseholdExport(baseInput());
    expect(JSON.parse(JSON.stringify(out))).toEqual(out);
  });
});

describe("HouseholdExportService", () => {
  it("reads the whole household over the three-month span and never writes", async () => {
    const { HouseholdExportService } = await import("@/lib/services/household-export.service");

    const expenses = [
      {
        id: 1,
        userId: 1,
        userName: "Matt",
        categoryId: 10,
        categoryName: "Groceries",
        amount: 100,
        note: null,
        date: "2025-11-01",
        month: "2025-10",
        createdAt: "2025-11-01T00:00:00.000Z",
      },
    ];
    const householdRepo = { getCurrent: vi.fn().mockResolvedValue({ id: 7, name: "Home", budgetMonthStartDay: 25, budgetMonthNoticePending: false }) };
    const userRepo = {
      findById: vi.fn().mockResolvedValue({ id: 1, name: "Matt" }),
      findAll: vi.fn().mockResolvedValue([{ id: 1, name: "Matt" }]),
    };
    const categoryRepo = { findAllIncludingInactive: vi.fn().mockResolvedValue([]) };
    const accountRepo = { findAllInHousehold: vi.fn().mockResolvedValue([]) };
    const expenseRepo = { findByMonth: vi.fn().mockResolvedValue(expenses) };
    const participantRepo = { findByExpenseIds: vi.fn().mockResolvedValue([]) };
    const incomeRepo = { findByMonth: vi.fn().mockResolvedValue([]) };
    const transferRepo = { findInPeriodForHousehold: vi.fn().mockResolvedValue([]) };
    const ledgerRepo = { findInPeriodForHousehold: vi.fn().mockResolvedValue([]) };
    const settlementRepo = { findInPeriodForHousehold: vi.fn().mockResolvedValue([]) };

    const svc = new HouseholdExportService(
      householdRepo as never,
      userRepo as never,
      categoryRepo as never,
      accountRepo as never,
      expenseRepo as never,
      participantRepo as never,
      incomeRepo as never,
      transferRepo as never,
      ledgerRepo as never,
      settlementRepo as never
    );

    const { filename, data } = await svc.buildForUser(1, { now: new Date("2025-11-09T10:00:00.000Z") });

    const span = { start: "2025-09-25", end: "2025-12-24" };
    expect(filename).toBe("homefinance-export-2025-09-25-to-2025-12-24.json");
    // No userId filter: every member's rows, over the whole span.
    expect(expenseRepo.findByMonth).toHaveBeenCalledWith("2025-11", undefined, undefined, span);
    expect(incomeRepo.findByMonth).toHaveBeenCalledWith("2025-11", undefined, undefined, span);
    expect(transferRepo.findInPeriodForHousehold).toHaveBeenCalledWith(span);
    expect(ledgerRepo.findInPeriodForHousehold).toHaveBeenCalledWith(span);
    expect(settlementRepo.findInPeriodForHousehold).toHaveBeenCalledWith(span);
    expect(participantRepo.findByExpenseIds).toHaveBeenCalledWith([1]);

    expect(data.meta.household).toEqual({ id: 7, name: "Home" });
    expect(data.meta.exportedBy).toEqual({ id: 1, name: "Matt" });
    expect(data.meta.budgetMonths.map((m) => m.key)).toEqual(["2025-09", "2025-10", "2025-11"]);
    expect(data.expenses).toHaveLength(1);
  });
});
