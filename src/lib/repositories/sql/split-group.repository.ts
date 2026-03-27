import { all, get, run, lastInsertId } from "@/lib/db";
import type { SplitGroup } from "@/lib/types";
import type { ISplitGroupRepository } from "../interfaces/split-group.repository";

interface SplitGroupRow {
  id: number;
  name: string;
  is_default: number;
  sort_order: number;
}

function toSplitGroup(r: SplitGroupRow): SplitGroup {
  return {
    id: r.id,
    name: r.name,
    isDefault: r.is_default === 1,
    sortOrder: r.sort_order,
  };
}

export class SplitGroupRepository implements ISplitGroupRepository {
  async findAll(): Promise<SplitGroup[]> {
    const rows = await all<SplitGroupRow>(
      "SELECT id, name, is_default, sort_order FROM split_groups ORDER BY sort_order, name"
    );
    return rows.map(toSplitGroup);
  }

  async findById(id: number): Promise<SplitGroup | null> {
    const row = await get<SplitGroupRow>(
      "SELECT id, name, is_default, sort_order FROM split_groups WHERE id = ?",
      [id]
    );
    return row ? toSplitGroup(row) : null;
  }

  async findDefault(): Promise<SplitGroup | null> {
    const row = await get<SplitGroupRow>(
      "SELECT id, name, is_default, sort_order FROM split_groups WHERE is_default = 1 LIMIT 1",
      []
    );
    return row ? toSplitGroup(row) : null;
  }

  async findByName(name: string): Promise<SplitGroup | null> {
    const row = await get<SplitGroupRow>(
      "SELECT id, name, is_default, sort_order FROM split_groups WHERE name = ?",
      [name]
    );
    return row ? toSplitGroup(row) : null;
  }

  async create(data: {
    name: string;
    isDefault?: boolean;
    sortOrder?: number;
  }): Promise<SplitGroup> {
    await run(
      "INSERT INTO split_groups (name, is_default, sort_order) VALUES (?, ?, ?)",
      [data.name, data.isDefault ? 1 : 0, data.sortOrder ?? 0]
    );
    const id = await lastInsertId();
    const row = (await get<SplitGroupRow>(
      "SELECT id, name, is_default, sort_order FROM split_groups WHERE id = ?",
      [id]
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
      params.push(data.isDefault ? 1 : 0);
    }
    if (data.sortOrder !== undefined) {
      updates.push("sort_order = ?");
      params.push(data.sortOrder);
    }
    if (updates.length === 0) return;
    params.push(id);
    await run(`UPDATE split_groups SET ${updates.join(", ")} WHERE id = ?`, params);
  }

  async delete(id: number): Promise<void> {
    await run("DELETE FROM split_groups WHERE id = ?", [id]);
  }

  async isInUse(id: number): Promise<boolean> {
    const expense = await get<{ id: number }>(
      "SELECT id FROM expenses WHERE split_expense_group_id = ? LIMIT 1",
      [id]
    );
    if (expense) return true;
    const settlement = await get<{ id: number }>(
      "SELECT id FROM split_settlements WHERE split_expense_group_id = ? LIMIT 1",
      [id]
    );
    return !!settlement;
  }
}
