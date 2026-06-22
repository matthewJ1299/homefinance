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
  split_expense_group_id?: number | null;
  payer_name?: string;
  recipient_name?: string;
}

function toRow(row: SettlementRow): SplitSettlementRow {
  return {
    id: row.id,
    payerUserId: row.payer_user_id,
    recipientUserId: row.recipient_user_id,
    amount: row.amount,
    date: row.date,
    expenseId: row.expense_id,
    incomeId: row.income_id,
    splitExpenseGroupId: row.split_expense_group_id ?? null,
  };
}

export class SplitSettlementRepository {
  async create(data: {
    payerUserId: number;
    recipientUserId: number;
    amount: number;
    date: string;
    expenseId?: number | null;
    incomeId?: number | null;
    splitExpenseGroupId?: number | null;
  }): Promise<{ id: number }> {
    await run(
      "INSERT INTO split_settlements (payer_user_id, recipient_user_id, amount, date, expense_id, income_id, split_expense_group_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        data.payerUserId,
        data.recipientUserId,
        data.amount,
        data.date,
        data.expenseId ?? null,
        data.incomeId ?? null,
        data.splitExpenseGroupId ?? null,
      ]
    );
    return { id: await lastInsertId() };
  }

  async findById(id: number): Promise<SplitSettlementRow | null> {
    const row = await get<SettlementRow>(
      "SELECT id, payer_user_id, recipient_user_id, amount, date, expense_id, income_id, split_expense_group_id FROM split_settlements WHERE id = ? LIMIT 1",
      [id]
    );
    return row ? toRow(row) : null;
  }

  async findAllForUser(userId: number, groupId?: number): Promise<SplitSettlementWithNames[]> {
    let sql = `SELECT ss.id, ss.payer_user_id, ss.recipient_user_id, ss.amount, ss.date, ss.expense_id, ss.income_id, ss.split_expense_group_id,
              p.name AS payer_name, r.name AS recipient_name
       FROM split_settlements ss
       INNER JOIN users p ON ss.payer_user_id = p.id
       INNER JOIN users r ON ss.recipient_user_id = r.id
       WHERE (ss.payer_user_id = ? OR ss.recipient_user_id = ?)`;
    const params: (string | number | boolean | null)[] = [userId, userId];
    if (groupId != null) {
      sql += " AND ss.split_expense_group_id = ?";
      params.push(groupId);
    }
    const rows = await all<SettlementRow>(sql, params);
    return rows.map((r) => ({
      ...toRow(r),
      payerUserName: r.payer_name ?? "",
      recipientUserName: r.recipient_name ?? "",
    }));
  }

  async findByExpenseId(expenseId: number): Promise<SplitSettlementRow | null> {
    const row = await get<SettlementRow>(
      "SELECT id, payer_user_id, recipient_user_id, amount, date, expense_id, income_id, split_expense_group_id FROM split_settlements WHERE expense_id = ? LIMIT 1",
      [expenseId]
    );
    return row ? toRow(row) : null;
  }

  async findByIncomeId(incomeId: number): Promise<SplitSettlementRow | null> {
    const row = await get<SettlementRow>(
      "SELECT id, payer_user_id, recipient_user_id, amount, date, expense_id, income_id, split_expense_group_id FROM split_settlements WHERE income_id = ? LIMIT 1",
      [incomeId]
    );
    return row ? toRow(row) : null;
  }

  async update(id: number, data: { amount?: number; date?: string }): Promise<void> {
    const updates: string[] = [];
    const params: (string | number | boolean | null)[] = [];
    if (data.amount != null) {
      updates.push("amount = ?");
      params.push(data.amount);
    }
    if (data.date != null) {
      updates.push("date = ?");
      params.push(data.date);
    }
    if (updates.length === 0) return;
    params.push(id);
    await run(`UPDATE split_settlements SET ${updates.join(", ")} WHERE id = ?`, params);
  }

  async delete(id: number): Promise<void> {
    await run("DELETE FROM split_settlements WHERE id = ?", [id]);
  }
}
