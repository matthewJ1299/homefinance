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
  findAllForBalance(groupId?: number): Promise<SplitAllocationBalanceRow[]>;
  /**
   * Split expenses paid by `payerUserId` in the given inclusive date range where
   * `debtorUserId` was allocated a share. Used by the "owed to me" statement.
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
