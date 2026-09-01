export interface SplitSettlementRow {
  id: number;
  payerUserId: number;
  recipientUserId: number;
  amount: number;
  date: string;
  expenseId?: number | null;
  incomeId?: number | null;
  splitExpenseGroupId?: number | null;
}

export interface SplitSettlementWithNames extends SplitSettlementRow {
  payerUserName: string;
  recipientUserName: string;
}

export interface ISplitSettlementRepository {
  create(data: {
    payerUserId: number;
    recipientUserId: number;
    amount: number;
    date: string;
    expenseId?: number | null;
    incomeId?: number | null;
    splitExpenseGroupId?: number | null;
  }): Promise<{ id: number }>;
  findById(id: number): Promise<SplitSettlementRow | null>;
  findAllForUser(userId: number, groupId?: number): Promise<SplitSettlementWithNames[]>;
  /** Latest settlement between these two users, any direction. */
  findLatestBetween(
    userIdA: number,
    userIdB: number,
    groupId?: number
  ): Promise<SplitSettlementRow | null>;
  findByExpenseId(expenseId: number): Promise<SplitSettlementRow | null>;
  findByIncomeId(incomeId: number): Promise<SplitSettlementRow | null>;
  update(
    id: number,
    data: { amount?: number; date?: string }
  ): Promise<void>;
  delete(id: number): Promise<void>;
}
