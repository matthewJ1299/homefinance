import { all, get, run, lastInsertId } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import type { SplitGroup } from "@/lib/types";
import type { ISplitGroupRepository } from "../interfaces/split-group.repository";

interface SplitGroupRow {
  id: number;
  name: string;
  /** Postgres uses BOOLEAN; legacy SQLite used 0/1. */
  is_default: boolean | number;
  sort_order: number;
}

function toSplitGroup(r: SplitGroupRow): SplitGroup {
  const d = r.is_default;
  const isDefault = d === true || d === 1;
  return {
    id: r.id,
    name: r.name,
    isDefault,
    sortOrder: r.sort_order,
  };
}

export class SplitGroupRepository implements ISplitGroupRepository {
  async findAll(): Promise<SplitGroup[]> {
    const hid = requireHouseholdId();
    const rows = await all<SplitGroupRow>(
      "SELECT id, name, is_default, sort_order FROM split_groups WHERE household_id = ? ORDER BY sort_order, name",
      [hid]
    );
    return rows.map(toSplitGroup);
  }

  async findById(id: number): Promise<SplitGroup | null> {
    const hid = requireHouseholdId();
    const row = await get<SplitGroupRow>(
      "SELECT id, name, is_default, sort_order FROM split_groups WHERE id = ? AND household_id = ?",
      [id, hid]
    );
    return row ? toSplitGroup(row) : null;
  }

  async findDefault(): Promise<SplitGroup | null> {
    const hid = requireHouseholdId();
    const row = await get<SplitGroupRow>(
      "SELECT id, name, is_default, sort_order FROM split_groups WHERE household_id = ? AND is_default IS TRUE LIMIT 1",
      [hid]
    );
    return row ? toSplitGroup(row) : null;
  }

  async findByName(name: string): Promise<SplitGroup | null> {
    const hid = requireHouseholdId();
    const row = await get<SplitGroupRow>(
      "SELECT id, name, is_default, sort_order FROM split_groups WHERE name = ? AND household_id = ?",
      [name, hid]
    );
    return row ? toSplitGroup(row) : null;
  }

  async create(data: {
    name: string;
    isDefault?: boolean;
    sortOrder?: number;
  }): Promise<SplitGroup> {
    const hid = requireHouseholdId();
    await run(
      "INSERT INTO split_groups (name, is_default, sort_order, household_id) VALUES (?, ?, ?, ?)",
      [data.name, data.isDefault ?? false, data.sortOrder ?? 0, hid]
    );
    const id = await lastInsertId();
    const row = (await get<SplitGroupRow>(
      "SELECT id, name, is_default, sort_order FROM split_groups WHERE id = ? AND household_id = ?",
      [id, hid]
    ))!;
    return toSplitGroup(row);
  }

  async update(
    id: number,
    data: { name?: string; isDefault?: boolean; sortOrder?: number }
  ): Promise<void> {
    const updates: string[] = [];
    const params: (string | number | boolean)[] = [];
    if (data.name !== undefined) {
      updates.push("name = ?");
      params.push(data.name);
    }
    if (data.isDefault !== undefined) {
      updates.push("is_default = ?");
      params.push(data.isDefault);
    }
    if (data.sortOrder !== undefined) {
      updates.push("sort_order = ?");
      params.push(data.sortOrder);
    }
    if (updates.length === 0) return;
    const hid = requireHouseholdId();
    params.push(id, hid);
    await run(`UPDATE split_groups SET ${updates.join(", ")} WHERE id = ? AND household_id = ?`, params);
  }

  async delete(id: number): Promise<void> {
    const hid = requireHouseholdId();
    await run("DELETE FROM split_groups WHERE id = ? AND household_id = ?", [id, hid]);
  }

  async isInUse(id: number): Promise<boolean> {
    const hid = requireHouseholdId();
    const expense = await get<{ id: number }>(
      "SELECT id FROM expenses WHERE household_id = ? AND split_expense_group_id = ? LIMIT 1",
      [hid, id]
    );
    if (expense) return true;
    const settlement = await get<{ id: number }>(
      "SELECT id FROM split_settlements WHERE household_id = ? AND split_expense_group_id = ? LIMIT 1",
      [hid, id]
    );
    return !!settlement;
  }
}
