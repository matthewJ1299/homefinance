import { all, get, lastInsertId, run } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import { normalizeBudgetMonthStartDay } from "@/lib/utils/date";
import type {
  IHouseholdRepository,
  HouseholdSummary,
} from "../interfaces/household.repository";

export class HouseholdRepository implements IHouseholdRepository {
  async createHousehold(name: string): Promise<number> {
    await run("INSERT INTO households (name) VALUES (?)", [name]);
    const id = await lastInsertId();
    if (id == null) {
      throw new Error("Household insert did not return an id");
    }
    return id;
  }

  async getCurrent(): Promise<HouseholdSummary | null> {
    const hid = requireHouseholdId();
    const row = await get<{
      id: number;
      name: string;
      budget_month_start_day: number | null;
      budget_month_notice_pending: boolean | null;
    }>(
      "SELECT id, name, budget_month_start_day, budget_month_notice_pending FROM households WHERE id = ?",
      [hid]
    );
    if (!row) return null;
    return {
      id: Number(row.id),
      name: row.name,
      budgetMonthStartDay: normalizeBudgetMonthStartDay(row.budget_month_start_day ?? 1),
      budgetMonthNoticePending: row.budget_month_notice_pending === true,
    };
  }

  async rename(name: string): Promise<void> {
    const hid = requireHouseholdId();
    await run("UPDATE households SET name = ? WHERE id = ?", [name, hid]);
  }

  async getBudgetMonthStartDay(): Promise<number> {
    const hid = requireHouseholdId();
    const row = await get<{ budget_month_start_day: number | null }>(
      "SELECT budget_month_start_day FROM households WHERE id = ?",
      [hid]
    );
    return normalizeBudgetMonthStartDay(row?.budget_month_start_day ?? 1);
  }

  async setBudgetMonthStartDay(day: number): Promise<void> {
    const hid = requireHouseholdId();
    await run("UPDATE households SET budget_month_start_day = ? WHERE id = ?", [
      normalizeBudgetMonthStartDay(day),
      hid,
    ]);
  }

  async clearBudgetMonthNotice(): Promise<void> {
    const hid = requireHouseholdId();
    await run("UPDATE households SET budget_month_notice_pending = FALSE WHERE id = ?", [hid]);
  }

  async listAllHouseholdIds(): Promise<number[]> {
    const rows = await all<{ id: number }>("SELECT id FROM households ORDER BY id");
    return rows.map((r) => Number(r.id));
  }
}
