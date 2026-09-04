import { all, get, run, lastInsertId } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import type { Category, CategoryWithActive } from "@/lib/types";
import type { ICategoryRepository } from "../interfaces/category.repository";

interface CategoryRow {
  id: number;
  name: string;
  group_name: string;
  icon: string | null;
  sort_order: number;
  is_active?: number | boolean;
  cost_type: string;
  default_amount: number | null;
  rollover?: boolean;
  target_minor?: number | null;
  target_date?: string | null;
}

function toCategory(r: CategoryRow, includeIsActive = false): Category | CategoryWithActive {
  const base = {
    id: r.id,
    name: r.name,
    groupName: r.group_name,
    icon: r.icon,
    sortOrder: r.sort_order,
    costType: r.cost_type as "fixed" | "variable",
    defaultAmount: r.default_amount,
    rollover: r.rollover ?? true,
    targetMinor: r.target_minor ?? null,
    targetDate: r.target_date ?? null,
  };
  if (includeIsActive && r.is_active !== undefined) {
    return { ...base, isActive: r.is_active === true || r.is_active === 1 };
  }
  return base;
}

export class CategoryRepository implements ICategoryRepository {
  async findAll(): Promise<Category[]> {
    const hid = requireHouseholdId();
    const rows = await all<CategoryRow>(
      "SELECT id, name, group_name, icon, sort_order, cost_type, default_amount, rollover, target_minor, target_date FROM categories WHERE household_id = ? AND is_active = true ORDER BY cost_type DESC, sort_order, name",
      [hid]
    );
    return rows.map((r) => toCategory(r) as Category);
  }

  async findAllIncludingInactive(): Promise<CategoryWithActive[]> {
    const hid = requireHouseholdId();
    const rows = await all<CategoryRow>(
      "SELECT id, name, group_name, icon, sort_order, is_active, cost_type, default_amount, rollover, target_minor, target_date FROM categories WHERE household_id = ? ORDER BY is_active DESC NULLS LAST, cost_type DESC, sort_order, name",
      [hid]
    );
    return rows.map((r) => toCategory(r, true) as CategoryWithActive);
  }

  async findById(id: number): Promise<Category | null> {
    const hid = requireHouseholdId();
    const row = await get<CategoryRow>(
      "SELECT id, name, group_name, icon, sort_order, cost_type, default_amount, rollover, target_minor, target_date FROM categories WHERE id = ? AND household_id = ?",
      [id, hid]
    );
    return row ? (toCategory(row) as Category) : null;
  }

  async findByName(name: string): Promise<Category | null> {
    const hid = requireHouseholdId();
    const row = await get<CategoryRow>(
      "SELECT id, name, group_name, icon, sort_order, cost_type, default_amount, rollover, target_minor, target_date FROM categories WHERE name = ? AND household_id = ?",
      [name, hid]
    );
    return row ? (toCategory(row) as Category) : null;
  }

  async create(data: {
    name: string;
    groupName: string;
    icon?: string;
    sortOrder?: number;
    costType?: "fixed" | "variable";
    defaultAmount?: number | null;
  }): Promise<Category> {
    const hid = requireHouseholdId();
    await run(
      "INSERT INTO categories (name, group_name, icon, sort_order, cost_type, default_amount, household_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        data.name,
        data.groupName,
        data.icon ?? null,
        data.sortOrder ?? 0,
        data.costType ?? "variable",
        data.defaultAmount ?? null,
        hid,
      ]
    );
    const id = await lastInsertId();
    const row = (await get<CategoryRow>(
      "SELECT id, name, group_name, icon, sort_order, cost_type, default_amount, rollover, target_minor, target_date FROM categories WHERE id = ? AND household_id = ?",
      [id, hid]
    ))!;
    return toCategory(row) as Category;
  }

  async update(
    id: number,
    data: {
      name?: string;
      groupName?: string;
      isActive?: boolean;
      sortOrder?: number;
      costType?: "fixed" | "variable";
      defaultAmount?: number | null;
      rollover?: boolean;
      targetMinor?: number | null;
      targetDate?: string | null;
    }
  ): Promise<void> {
    const updates: string[] = [];
    const params: (string | number | boolean | null)[] = [];
    if (data.name !== undefined) {
      updates.push("name = ?");
      params.push(data.name);
    }
    if (data.groupName !== undefined) {
      updates.push("group_name = ?");
      params.push(data.groupName);
    }
    if (data.isActive !== undefined) {
      updates.push("is_active = ?");
      params.push(data.isActive);
    }
    if (data.sortOrder !== undefined) {
      updates.push("sort_order = ?");
      params.push(data.sortOrder);
    }
    if (data.costType !== undefined) {
      updates.push("cost_type = ?");
      params.push(data.costType);
    }
    if (data.defaultAmount !== undefined) {
      updates.push("default_amount = ?");
      params.push(data.defaultAmount);
    }
    if (data.rollover !== undefined) {
      updates.push("rollover = ?");
      params.push(data.rollover);
    }
    if (data.targetMinor !== undefined) {
      updates.push("target_minor = ?");
      params.push(data.targetMinor);
    }
    if (data.targetDate !== undefined) {
      updates.push("target_date = ?");
      params.push(data.targetDate);
    }
    if (updates.length === 0) return;
    const hid = requireHouseholdId();
    params.push(id, hid);
    await run(`UPDATE categories SET ${updates.join(", ")} WHERE id = ? AND household_id = ?`, params);
  }

  async delete(id: number): Promise<void> {
    const hid = requireHouseholdId();
    await run("DELETE FROM categories WHERE id = ? AND household_id = ?", [id, hid]);
  }

  async isInUse(id: number): Promise<boolean> {
    const hid = requireHouseholdId();
    const expense = await get<{ id: number }>(
      "SELECT id FROM expenses WHERE category_id = ? AND household_id = ? LIMIT 1",
      [id, hid]
    );
    if (expense) return true;
    const budget = await get<{ id: number }>(
      "SELECT id FROM budgets WHERE category_id = ? AND household_id = ? LIMIT 1",
      [id, hid]
    );
    if (budget) return true;
    const transfer = await get<{ id: number }>(
      "SELECT id FROM budget_transfers WHERE (from_category_id = ? OR to_category_id = ?) AND household_id = ? LIMIT 1",
      [id, id, hid]
    );
    return !!transfer;
  }
}
