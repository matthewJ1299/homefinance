export interface SplitSettlementRow {
  id: number;
  payerUserId: number;
  recipientUserId: number;
  amount: number;
  date: string;
  expenseId?: number | null;
  incomeId?: number | null;
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
  }): Promise<{ id: number }>;
  findAllForUser(userId: number): Promise<SplitSettlementWithNames[]>;
  findByExpenseId(expenseId: number): Promise<SplitSettlementRow | null>;
  delete(id: number): Promise<void>;
}
