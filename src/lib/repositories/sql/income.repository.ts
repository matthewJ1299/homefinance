import { all, get, run, lastInsertId } from "@/lib/db";
import type { BudgetMonthPeriod } from "@/lib/types/budget-month";
import type { IncomeEntry } from "../interfaces/income.repository";
import type {
  IIncomeRepository,
  CreateIncomeInput,
  UpdateIncomeInput,
} from "../interfaces/income.repository";

const SELECT_INCOME_ENTRY = `
  SELECT i.id, i.user_id AS "userId", u.name AS "userName", i.amount, i.type, i.description, i.date,
         i.month AS "month", i.account_id AS "accountId", i.created_at AS "createdAt"
  FROM income i
  INNER JOIN users u ON i.user_id = u.id
`;

interface IncomeEntryRow {
  id: number;
  userId: number;
  userName: string;
  amount: number;
  type: string;
  description: string | null;
  date: string;
  month: string;
  accountId: number | null;
  createdAt: string;
}

function toIncomeEntry(r: IncomeEntryRow): IncomeEntry {
  return {
    id: r.id,
    userId: r.userId,
    userName: r.userName,
    amount: r.amount,
    type: r.type as "salary" | "ad_hoc",
    description: r.description,
    date: r.date,
    month: r.month,
    accountId: r.accountId ?? undefined,
    createdAt: r.createdAt,
  };
}

export class IncomeRepository implements IIncomeRepository {
  async findByMonth(
    month: string,
    userId?: number,
    accountId?: number,
    period?: BudgetMonthPeriod
  ): Promise<IncomeEntry[]> {
    let sql = `${SELECT_INCOME_ENTRY} WHERE `;
    const params: (string | number)[] = [];
    if (period) {
      sql += "i.date >= ? AND i.date <= ?";
      params.push(period.start, period.end);
    } else {
      sql += "i.month = ?";
      params.push(month);
    }
    if (userId != null) {
      sql += " AND i.user_id = ?";
      params.push(userId);
    }
    if (accountId != null) {
      sql += " AND i.account_id = ?";
      params.push(accountId);
    }
    sql += " ORDER BY i.date";
    const rows = await all<IncomeEntryRow>(sql, params);
    return rows.map(toIncomeEntry);
  }

  async findById(id: number): Promise<IncomeEntry | null> {
    const row = await get<IncomeEntryRow>(`${SELECT_INCOME_ENTRY} WHERE i.id = ?`, [id]);
    return row ? toIncomeEntry(row) : null;
  }

  async findAllByUserId(userId: number): Promise<IncomeEntry[]> {
    const sql = `${SELECT_INCOME_ENTRY} WHERE i.user_id = ? ORDER BY i.date ASC, i.created_at ASC, i.id ASC`;
    const rows = await all<IncomeEntryRow>(sql, [userId]);
    return rows.map(toIncomeEntry);
  }

  async create(data: CreateIncomeInput): Promise<{ id: number }> {
    await run(
      "INSERT INTO income (user_id, amount, type, description, date, month, recurring_income_id, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        data.userId,
        data.amount,
        data.type,
        data.description ?? null,
        data.date,
        data.month,
        data.recurringIncomeId ?? null,
        data.accountId ?? null,
      ]
    );
    return { id: await lastInsertId() };
  }

  async hasIncomeFromRecurring(recurringIncomeId: number, month: string): Promise<boolean> {
    const row = await get<{ id: number }>(
      "SELECT id FROM income WHERE recurring_income_id = ? AND month = ? LIMIT 1",
      [recurringIncomeId, month]
    );
    return !!row;
  }

  async update(id: number, data: UpdateIncomeInput): Promise<void> {
    const updates: string[] = [];
    const params: (string | number | null)[] = [];
    if (data.amount != null) {
      updates.push("amount = ?");
      params.push(data.amount);
    }
    if (data.type != null) {
      updates.push("type = ?");
      params.push(data.type);
    }
    if (data.description !== undefined) {
      updates.push("description = ?");
      params.push(data.description);
    }
    if (data.date != null) {
      updates.push("date = ?");
      params.push(data.date);
    }
    if (data.month != null) {
      updates.push("month = ?");
      params.push(data.month);
    }
    if (updates.length === 0) return;
    params.push(id);
    await run(`UPDATE income SET ${updates.join(", ")} WHERE id = ?`, params);
  }

  async delete(id: number): Promise<void> {
    await run("DELETE FROM income WHERE id = ?", [id]);
  }
}
