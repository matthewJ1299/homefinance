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

export interface ISplitAllocationRepository {
  create(expenseId: number, userId: number, amount: number): Promise<{ id: number }>;
  findByExpenseId(expenseId: number): Promise<SplitAllocationWithUser[]>;
  findAllForBalance(): Promise<SplitAllocationBalanceRow[]>;
  deleteByExpenseId(expenseId: number): Promise<void>;
}
