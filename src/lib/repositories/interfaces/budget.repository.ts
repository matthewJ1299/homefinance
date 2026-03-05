export interface BudgetAllocation {
  categoryId: number;
  allocatedAmount: number;
}

export interface BudgetTransferRecord {
  id: number;
  fromCategoryId: number;
  toCategoryId: number;
  month: string;
  amount: number;
  userId: number;
  reason: string | null;
  createdAt: string;
}

export interface BudgetAllocationWithMonth extends BudgetAllocation {
  month: string;
}

export interface IBudgetRepository {
  getAllocationsForMonth(month: string, userId: number): Promise<BudgetAllocation[]>;
  /** Allocations for any of the given months (for carry-over resolution). */
  getAllocationsForMonths(months: string[], userId: number): Promise<BudgetAllocationWithMonth[]>;
  upsertAllocation(categoryId: number, month: string, amount: number, userId: number): Promise<void>;
  getTransfersForMonth(month: string, userId: number): Promise<BudgetTransferRecord[]>;
  createTransfer(data: {
    fromCategoryId: number;
    toCategoryId: number;
    month: string;
    amount: number;
    userId: number;
    reason?: string | null;
  }): Promise<void>;
}
