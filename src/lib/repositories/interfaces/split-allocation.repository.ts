export interface SplitAllocationRow {
  id: number;
  expenseId: number;
  userId: number;
  amount: number;
}

export interface SplitAllocationWithUser extends SplitAllocationRow {
  userName: string;
}

export interface SplitAllocationBalanceRow {
  amount: number;
  paidByUserId: number;
  paidByUserName: string;
  allocationUserId: number;
  allocationUserName: string;
}

/** A single split expense the payer covered and the debtor owes a share of. */
export interface OwedLineItemRow {
  expenseId: number;
  note: string | null;
  date: string;
  categoryName: string | null;
  amount: number;
}

export interface ISplitAllocationRepository {
  create(expenseId: number, userId: number, amount: number): Promise<{ id: number }>;
  findByExpenseId(expenseId: number): Promise<SplitAllocationWithUser[]>;
  /** Allocations for many expenses at once, keyed by expense id. */
  findByExpenseIds(expenseIds: number[]): Promise<Map<number, SplitAllocationWithUser[]>>;
  findAllForBalance(groupId?: number): Promise<SplitAllocationBalanceRow[]>;
  /**
   * Split expenses paid by `payerUserId` where `debtorUserId` was allocated a share,
   * with `e.date` in the inclusive range. Used by the owed statement.
   */
  findOwedToPayerInPeriod(
    payerUserId: number,
    debtorUserId: number,
    start: string,
    end: string,
    groupId?: number
  ): Promise<OwedLineItemRow[]>;
  deleteByExpenseId(expenseId: number): Promise<void>;
}
