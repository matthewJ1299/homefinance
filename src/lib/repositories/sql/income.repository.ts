import { all, get, run, lastInsertId } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
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
  INNER JOIN users u ON i.user_id = u.id AND u.household_id = i.household_id
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
    const hid = requireHouseholdId();
    let sql = `${SELECT_INCOME_ENTRY} WHERE i.household_id = ? AND `;
    const params: (string | number)[] = [hid];
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
    const hid = requireHouseholdId();
    const row = await get<IncomeEntryRow>(
      `${SELECT_INCOME_ENTRY} WHERE i.id = ? AND i.household_id = ?`,
      [id, hid]
    );
    return row ? toIncomeEntry(row) : null;
  }

  async findAllByUserId(userId: number): Promise<IncomeEntry[]> {
    const hid = requireHouseholdId();
    const sql = `${SELECT_INCOME_ENTRY} WHERE i.household_id = ? AND i.user_id = ? ORDER BY i.date ASC, i.created_at ASC, i.id ASC`;
    const rows = await all<IncomeEntryRow>(sql, [hid, userId]);
    return rows.map(toIncomeEntry);
  }

  async create(data: CreateIncomeInput): Promise<{ id: number }> {
    const hid = requireHouseholdId();
    await run(
      "INSERT INTO income (user_id, household_id, amount, type, description, date, month, recurring_income_id, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        data.userId,
        hid,
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
    const hid = requireHouseholdId();
    const row = await get<{ id: number }>(
      "SELECT id FROM income WHERE household_id = ? AND recurring_income_id = ? AND month = ? LIMIT 1",
      [hid, recurringIncomeId, month]
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
    const hid = requireHouseholdId();
    params.push(id, hid);
    await run(`UPDATE income SET ${updates.join(", ")} WHERE id = ? AND household_id = ?`, params);
  }

  async delete(id: number): Promise<void> {
    const hid = requireHouseholdId();
    await run("DELETE FROM income WHERE id = ? AND household_id = ?", [id, hid]);
  }
}
