import { all, run } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import type {
  IExpenseParticipantRepository,
  ExpenseParticipantRow,
} from "../interfaces/expense-participant.repository";
import type { ParticipantShare } from "@/lib/services/finance/participants";

export class ExpenseParticipantRepository implements IExpenseParticipantRepository {
  async createMany(expenseId: number, participants: ParticipantShare[]): Promise<void> {
    if (participants.length === 0) return;
    const hid = requireHouseholdId();
    const values = participants.map(() => "(?, ?, ?, ?)").join(",");
    const params = participants.flatMap((p) => [hid, expenseId, p.userId, p.shareMinor]);
    await run(
      `INSERT INTO expense_participants (household_id, expense_id, user_id, share_minor)
       VALUES ${values}
       ON CONFLICT (expense_id, user_id) DO UPDATE SET share_minor = excluded.share_minor`,
      params
    );
  }

  async replaceForExpense(expenseId: number, participants: ParticipantShare[]): Promise<void> {
    await this.deleteByExpenseId(expenseId);
    await this.createMany(expenseId, participants);
  }

  async findByExpenseId(expenseId: number): Promise<ExpenseParticipantRow[]> {
    const hid = requireHouseholdId();
    const rows = await all<{ id: number; expense_id: number; user_id: number; share_minor: number; name: string }>(
      `SELECT p.id, p.expense_id, p.user_id, p.share_minor, u.name
       FROM expense_participants p JOIN users u ON u.id = p.user_id
       WHERE p.expense_id = ? AND p.household_id = ? ORDER BY p.user_id`,
      [expenseId, hid]
    );
    return rows.map((r) => ({
      id: r.id, expenseId: r.expense_id, userId: r.user_id,
      shareMinor: r.share_minor, userName: r.name,
    }));
  }

  async getSharesForExpenses(expenseIds: number[], userId: number): Promise<Map<number, number>> {
    if (expenseIds.length === 0) return new Map();
    const hid = requireHouseholdId();
    const placeholders = expenseIds.map(() => "?").join(",");
    const rows = await all<{ expense_id: number; share_minor: number }>(
      `SELECT expense_id, share_minor FROM expense_participants
       WHERE household_id = ? AND user_id = ? AND expense_id IN (${placeholders})`,
      [hid, userId, ...expenseIds]
    );
    return new Map(rows.map((r) => [r.expense_id, r.share_minor]));
  }

  async deleteByExpenseId(expenseId: number): Promise<void> {
    const hid = requireHouseholdId();
    await run("DELETE FROM expense_participants WHERE expense_id = ? AND household_id = ?", [expenseId, hid]);
  }
}
