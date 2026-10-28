import type { ParticipantShare } from "@/lib/services/finance/participants";

export interface ExpenseParticipantRow extends ParticipantShare {
  id: number;
  expenseId: number;
  userName: string;
}

export interface IExpenseParticipantRepository {
  createMany(expenseId: number, participants: ParticipantShare[]): Promise<void>;
  replaceForExpense(expenseId: number, participants: ParticipantShare[]): Promise<void>;
  findByExpenseId(expenseId: number): Promise<ExpenseParticipantRow[]>;
  /** expenseId -> that user's share. Only ids the user participates in. */
  getSharesForExpenses(expenseIds: number[], userId: number): Promise<Map<number, number>>;
  deleteByExpenseId(expenseId: number): Promise<void>;
}
