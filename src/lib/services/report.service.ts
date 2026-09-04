import { all } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import { getUserRepository } from "@/lib/repositories";
import { MortgageService } from "@/lib/services/mortgage.service";
import { budgetMonthKeyFromIsoDate, normalizeBudgetMonthStartDay } from "@/lib/utils/date";

export interface MonthlyInOutRow {
  month: string;
  incomeMinor: number;
  spentMinor: number;
}

export interface CategoryTotalRow {
  categoryId: number;
  name: string;
  totalMinor: number;
  /** Fraction of the period's total spend, 0-1. */
  share: number;
}

export interface BudgetAccuracyRow {
  categoryId: number;
  name: string;
  assignedMinor: number;
  spentMinor: number;
  /** assigned - spent. Positive means room to spare. */
  deltaMinor: number;
  /** How many of the period's months had room left. */
  monthsWithRoom: number;
  monthsCounted: number;
}

export interface MortgageSplitRow {
  month: string;
  interestMinor: number;
  equityMinor: number;
}

/**
 * Reports are per-user and pure arithmetic over the ledger.
 *
 * Every figure here must equal the same sum computed from the raw rows -- that
 * is the Phase 0 report assertion, and the reason nothing is cached or
 * pre-aggregated. Spend is the viewer's own share, taken from
 * expense_participants, so a shared spend is never counted twice.
 */
export class ReportService {
  /** Earliest transaction date for this user, or null when they have none. */
  async earliestDate(userId: number): Promise<string | null> {
    const hid = requireHouseholdId();
    const rows = await all<{ d: string | null }>(
      `SELECT MIN(d) AS d FROM (
         SELECT MIN(date) AS d FROM expenses WHERE household_id = ? AND user_id = ?
         UNION ALL
         SELECT MIN(date) AS d FROM income   WHERE household_id = ? AND user_id = ?
       ) t`,
      [hid, userId, hid, userId]
    );
    return rows[0]?.d ?? null;
  }

  private async startDay(userId: number): Promise<number> {
    return normalizeBudgetMonthStartDay(
      await getUserRepository().getBudgetMonthStartDay(userId)
    );
  }

  async monthlyInOut(userId: number, from: string, to: string): Promise<MonthlyInOutRow[]> {
    const hid = requireHouseholdId();
    const startDay = await this.startDay(userId);

    const [spends, incomes] = await Promise.all([
      all<{ date: string; amount: number }>(
        `SELECT e.date, COALESCE(p.share_minor, e.amount) AS amount
         FROM expenses e
         LEFT JOIN expense_participants p ON p.expense_id = e.id AND p.user_id = ?
         WHERE e.household_id = ? AND e.user_id = ? AND e.date >= ? AND e.date <= ?`,
        [userId, hid, userId, from, to]
      ),
      all<{ date: string; amount: number }>(
        "SELECT date, amount FROM income WHERE household_id = ? AND user_id = ? AND date >= ? AND date <= ?",
        [hid, userId, from, to]
      ),
    ]);

    const byMonth = new Map<string, MonthlyInOutRow>();
    const bucket = (date: string) => {
      const key = budgetMonthKeyFromIsoDate(date, startDay);
      let row = byMonth.get(key);
      if (!row) {
        row = { month: key, incomeMinor: 0, spentMinor: 0 };
        byMonth.set(key, row);
      }
      return row;
    };
    for (const s of spends) bucket(s.date).spentMinor += s.amount;
    for (const i of incomes) bucket(i.date).incomeMinor += i.amount;

    return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
  }

  async categoryTotals(userId: number, from: string, to: string): Promise<CategoryTotalRow[]> {
    const hid = requireHouseholdId();
    const rows = await all<{ category_id: number; name: string; total: number }>(
      `SELECT e.category_id, c.name, SUM(COALESCE(p.share_minor, e.amount)) AS total
       FROM expenses e
       INNER JOIN categories c ON c.id = e.category_id AND c.household_id = e.household_id
       LEFT JOIN expense_participants p ON p.expense_id = e.id AND p.user_id = ?
       WHERE e.household_id = ? AND e.user_id = ? AND e.date >= ? AND e.date <= ?
       GROUP BY e.category_id, c.name
       ORDER BY total DESC`,
      [userId, hid, userId, from, to]
    );
    const overall = rows.reduce((s, r) => s + Number(r.total), 0);
    return rows.map((r) => ({
      categoryId: r.category_id,
      name: r.name,
      totalMinor: Number(r.total),
      share: overall > 0 ? Number(r.total) / overall : 0,
    }));
  }

  async budgetAccuracy(userId: number, from: string, to: string): Promise<BudgetAccuracyRow[]> {
    const hid = requireHouseholdId();
    const startDay = await this.startDay(userId);
    const months = new Set(
      (await this.monthlyInOut(userId, from, to)).map((m) => m.month)
    );
    if (months.size === 0) return [];
    const placeholders = [...months].map(() => "?").join(",");

    const [assigned, spent] = await Promise.all([
      all<{ category_id: number; month: string; amount: number }>(
        `SELECT category_id, month, allocated_amount AS amount
         FROM budgets
         WHERE household_id = ? AND user_id = ? AND month IN (${placeholders})`,
        [hid, userId, ...months]
      ),
      all<{ category_id: number; name: string; date: string; amount: number }>(
        `SELECT e.category_id, c.name, e.date, COALESCE(p.share_minor, e.amount) AS amount
         FROM expenses e
         INNER JOIN categories c ON c.id = e.category_id AND c.household_id = e.household_id
         LEFT JOIN expense_participants p ON p.expense_id = e.id AND p.user_id = ?
         WHERE e.household_id = ? AND e.user_id = ? AND e.date >= ? AND e.date <= ?`,
        [userId, hid, userId, from, to]
      ),
    ]);

    const names = new Map<number, string>();
    const perCategoryMonth = new Map<string, { assigned: number; spent: number }>();
    const cell = (categoryId: number, month: string) => {
      const key = `${categoryId}:${month}`;
      let c = perCategoryMonth.get(key);
      if (!c) {
        c = { assigned: 0, spent: 0 };
        perCategoryMonth.set(key, c);
      }
      return c;
    };
    for (const a of assigned) cell(a.category_id, a.month).assigned += Number(a.amount);
    for (const s of spent) {
      names.set(s.category_id, s.name);
      cell(s.category_id, budgetMonthKeyFromIsoDate(s.date, startDay)).spent += Number(s.amount);
    }

    const totals = new Map<number, BudgetAccuracyRow>();
    for (const [key, c] of perCategoryMonth) {
      const categoryId = Number(key.split(":")[0]);
      let row = totals.get(categoryId);
      if (!row) {
        row = {
          categoryId,
          name: names.get(categoryId) ?? String(categoryId),
          assignedMinor: 0,
          spentMinor: 0,
          deltaMinor: 0,
          monthsWithRoom: 0,
          monthsCounted: 0,
        };
        totals.set(categoryId, row);
      }
      row.assignedMinor += c.assigned;
      row.spentMinor += c.spent;
      row.monthsCounted += 1;
      if (c.assigned > 0 && c.spent < c.assigned) row.monthsWithRoom += 1;
    }
    for (const row of totals.values()) row.deltaMinor = row.assignedMinor - row.spentMinor;

    return [...totals.values()].sort((a, b) => b.deltaMinor - a.deltaMinor);
  }

  /**
   * Interest paid versus equity gained, per month of the bond schedule. Not
   * per-user: the house is one thing, and the split lives on /mortgage.
   */
  async mortgageInterestVsEquity(): Promise<MortgageSplitRow[]> {
    const schedule = await new MortgageService().getSchedule();
    if (!schedule) return [];
    return schedule.schedule.map((r) => ({
      month: r.date,
      interestMinor: r.interest,
      equityMinor: r.principal,
    }));
  }

  /**
   * Plain observations, not advice. Only says what the arithmetic supports:
   * a category with room in most of the months it was budgeted for.
   */
  worthDoing(accuracy: BudgetAccuracyRow[]): string[] {
    const spare = accuracy.filter(
      (r) => r.monthsCounted >= 3 && r.monthsWithRoom / r.monthsCounted >= 0.75 && r.deltaMinor > 0
    );
    if (spare.length === 0) return [];
    const names = spare.slice(0, 3).map((r) => r.name);
    const list =
      names.length === 1
        ? names[0]
        : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    return [`${list} ${names.length === 1 ? "has" : "have"} spare room nearly every month.`];
  }
}
