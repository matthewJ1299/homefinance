import { describe, it, expect, vi } from "vitest";
import { SplitService } from "@/lib/services/split.service";
import { calculateSplitBalance, type SplitAllocationBalanceRow, type SplitSettlementRow } from "@/lib/services/finance/accounts";
import { GoalProjectionService } from "@/lib/services/goal-projection.service";
import { calculateProgressPct } from "@/lib/services/finance/goals";
import { projectSavingsGoalCompletionMonth } from "@/lib/services/finance/projections";

describe("Service-level non-regression (pure helper parity)", () => {
  it("SplitService.getBalance matches calculateSplitBalance", async () => {
    const allocations: SplitAllocationBalanceRow[] = [
      {
        paidByUserId: 1,
        paidByUserName: "A",
        allocationUserId: 2,
        allocationUserName: "B",
        amount: 50,
      },
    ];
    const settlements: SplitSettlementRow[] = [
      {
        payerUserId: 2,
        payerUserName: "B",
        recipientUserId: 1,
        recipientUserName: "A",
        amount: 20,
      },
    ];

    const allocationRepo = { findAllForBalance: vi.fn().mockResolvedValue(allocations) };
    const settlementRepo = { findAllForUser: vi.fn().mockResolvedValue(settlements) };

    // Constructor order:
    // expenseRepo, allocationRepo, settlementRepo, splitGroupRepo, userRepo, categoryRepo, incomeRepo, accountTxRepo
    const splitService = new SplitService(
      {} as never,
      allocationRepo as never,
      settlementRepo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never
    );

    const result = await splitService.getBalance(1);
    const expected = calculateSplitBalance({ currentUserId: 1, allocations, settlements });
    expect(result).toEqual(expected);
  });

  it("GoalProjectionService.getSavingsProgress matches finance helpers", async () => {
    const goal = {
      id: 1,
      ownerUserId: 1,
      name: "Trip",
      type: "savings",
      targetAmount: 10_000,
      monthlyTarget: 2_000,
      linkedAccountId: 1,
      apr: null,
      strategy: null,
      archivedAt: null,
      createdAt: "2024-01-01",
    } as const;

    const goalRepo = { findById: vi.fn().mockResolvedValue(goal) };
    const contribRepo = {
      totalsByGoal: vi.fn().mockResolvedValue({
        totalContributed: 3_000,
        totalWithdrawn: 500,
        totalPaid: 0,
        totalInterest: 0,
      }),
      totalsByGoalForMonth: vi.fn().mockResolvedValue({
        totalContributed: 2_000,
        totalWithdrawn: 0,
        totalPaid: 0,
        totalInterest: 0,
      }),
    };
    const txRepo = {} as never;

    const svc = new GoalProjectionService(goalRepo as never, contribRepo as never, txRepo);

    const progress = await svc.getSavingsProgress(1, 1, "2024-03");

    const current = 3_000 - 500;
    const progressPct = calculateProgressPct({ current, target: 10_000 });
    const projectedCompletionMonth = projectSavingsGoalCompletionMonth({
      month: "2024-03",
      remaining: 10_000 - current,
      monthlyTarget: 2_000,
    });

    expect(progress.current).toBe(current);
    expect(progress.progressPct).toBe(progressPct);
    expect(progress.projectedCompletionMonth).toBe(projectedCompletionMonth);
  });
});

