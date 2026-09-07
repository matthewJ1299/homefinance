export interface BudgetAllocation {
  categoryId: number;
  allocatedAmount: number;
  carriedInMinor?: number;
}

export interface BudgetMonthOpenState {
  month: string;
  overspendCarriedMinor: number;
  openedAt: string;
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
  /** Carry-in per category for a month. Empty map when the month is not opened. */
  getCarriedInForMonth(month: string, userId: number): Promise<Map<number, number>>;
  setCarriedIn(categoryId: number, month: string, amount: number, userId: number): Promise<void>;
  /** Adds `delta` (may be negative) to `carried_in_minor`. Never below zero. */
  adjustCarriedIn(categoryId: number, month: string, delta: number, userId: number): Promise<void>;
  getMonthOpenState(month: string, userId: number): Promise<BudgetMonthOpenState | null>;
  recordMonthOpen(month: string, userId: number, overspendCarriedMinor: number): Promise<void>;
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
