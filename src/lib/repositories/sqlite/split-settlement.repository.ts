import { all, get, run, lastInsertId } from "@/lib/db";
import type {
  SplitSettlementRow,
  SplitSettlementWithNames,
} from "../interfaces/split-settlement.repository";

interface SettlementRow {
  id: number;
  payer_user_id: number;
  recipient_user_id: number;
  amount: number;
  date: string;
  expense_id: number | null;
  income_id: number | null;
  payer_name: string;
  recipient_name: string;
}

export class SplitSettlementRepository {
  async create(data: {
    payerUserId: number;
    recipientUserId: number;
    amount: number;
    date: string;
    expenseId?: number | null;
    incomeId?: number | null;
  }): Promise<{ id: number }> {
    run(
      "INSERT INTO split_settlements (payer_user_id, recipient_user_id, amount, date, expense_id, income_id) VALUES (?, ?, ?, ?, ?, ?)",
      [
        data.payerUserId,
        data.recipientUserId,
        data.amount,
        data.date,
        data.expenseId ?? null,
        data.incomeId ?? null,
      ]
    );
    return { id: lastInsertId() };
  }

  async findAllForUser(userId: number): Promise<SplitSettlementWithNames[]> {
    const rows = all<SettlementRow>(
      `SELECT ss.id, ss.payer_user_id, ss.recipient_user_id, ss.amount, ss.date, ss.expense_id, ss.income_id,
              p.name AS payer_name, r.name AS recipient_name
       FROM split_settlements ss
       INNER JOIN users p ON ss.payer_user_id = p.id
       INNER JOIN users r ON ss.recipient_user_id = r.id
       WHERE ss.payer_user_id = ? OR ss.recipient_user_id = ?`,
      [userId, userId]
    );
    return rows.map((r) => ({
      id: r.id,
      payerUserId: r.payer_user_id,
      recipientUserId: r.recipient_user_id,
      amount: r.amount,
      date: r.date,
      expenseId: r.expense_id,
      incomeId: r.income_id,
      payerUserName: r.payer_name,
      recipientUserName: r.recipient_name,
    }));
  }

  async findByExpenseId(expenseId: number): Promise<SplitSettlementRow | null> {
    const row = get<SettlementRow>(
      "SELECT id, payer_user_id, recipient_user_id, amount, date, expense_id, income_id FROM split_settlements WHERE expense_id = ? LIMIT 1",
      [expenseId]
    );
    if (!row) return null;
    return {
      id: row.id,
      payerUserId: row.payer_user_id,
      recipientUserId: row.recipient_user_id,
      amount: row.amount,
      date: row.date,
      expenseId: row.expense_id,
      incomeId: row.income_id,
    };
  }

  async delete(id: number): Promise<void> {
    run("DELETE FROM split_settlements WHERE id = ?", [id]);
  }
}
