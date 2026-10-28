import { describe, it, expect, vi } from "vitest";
import { SplitService } from "@/lib/services/split.service";
import { calculateSplitBalance, type SplitAllocationBalanceRow, type SplitSettlementRow } from "@/lib/services/finance/accounts";

/**
 * The savings-goal parity test that used to sit here went with
 * GoalProjectionService: goals are categories with a target since migration 0043,
 * and the old model's services and routes were unreachable from the UI. The pure
 * helpers it exercised are still covered directly in finance.test.ts.
 */
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

});

