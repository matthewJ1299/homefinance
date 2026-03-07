import { all, get, run, lastInsertId } from "@/lib/db";
import type { Category, CategoryWithActive } from "@/lib/types";
import type { ICategoryRepository } from "../interfaces/category.repository";

interface CategoryRow {
  id: number;
  name: string;
  group_name: string;
  icon: string | null;
  sort_order: number;
  is_active?: number;
  cost_type: string;
  default_amount: number | null;
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
  };
  if (includeIsActive && r.is_active !== undefined) {
    return { ...base, isActive: r.is_active === 1 };
  }
  return base;
}

export class CategoryRepository implements ICategoryRepository {
  async findAll(): Promise<Category[]> {
    const rows = await all<CategoryRow>(
      "SELECT id, name, group_name, icon, sort_order, cost_type, default_amount FROM categories WHERE is_active = 1 ORDER BY cost_type DESC, sort_order, name"
    );
    return rows.map((r) => toCategory(r) as Category);
  }

  async findAllIncludingInactive(): Promise<CategoryWithActive[]> {
    const rows = await all<CategoryRow>(
      "SELECT id, name, group_name, icon, sort_order, is_active, cost_type, default_amount FROM categories ORDER BY is_active DESC, cost_type DESC, sort_order, name"
    );
    return rows.map((r) => toCategory(r, true) as CategoryWithActive);
  }

  async findById(id: number): Promise<Category | null> {
    const row = await get<CategoryRow>(
      "SELECT id, name, group_name, icon, sort_order, cost_type, default_amount FROM categories WHERE id = ?",
      [id]
    );
    return row ? (toCategory(row) as Category) : null;
  }

  async findByName(name: string): Promise<Category | null> {
    const row = await get<CategoryRow>(
      "SELECT id, name, group_name, icon, sort_order, cost_type, default_amount FROM categories WHERE name = ?",
      [name]
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
    await run(
      "INSERT INTO categories (name, group_name, icon, sort_order, cost_type, default_amount) VALUES (?, ?, ?, ?, ?, ?)",
      [
        data.name,
        data.groupName,
        data.icon ?? null,
        data.sortOrder ?? 0,
        data.costType ?? "variable",
        data.defaultAmount ?? null,
      ]
    );
    const id = await lastInsertId();
    const row = (await get<CategoryRow>(
      "SELECT id, name, group_name, icon, sort_order, cost_type, default_amount FROM categories WHERE id = ?",
      [id]
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
    }
  ): Promise<void> {
    const updates: string[] = [];
    const params: (string | number | null)[] = [];
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
      params.push(data.isActive ? 1 : 0);
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
    if (updates.length === 0) return;
    params.push(id);
    await run(`UPDATE categories SET ${updates.join(", ")} WHERE id = ?`, params);
  }

  async delete(id: number): Promise<void> {
    await run("DELETE FROM categories WHERE id = ?", [id]);
  }

  async isInUse(id: number): Promise<boolean> {
    const expense = await get<{ id: number }>("SELECT id FROM expenses WHERE category_id = ? LIMIT 1", [id]);
    if (expense) return true;
    const budget = await get<{ id: number }>("SELECT id FROM budgets WHERE category_id = ? LIMIT 1", [id]);
    if (budget) return true;
    const transfer = await get<{ id: number }>(
      "SELECT id FROM budget_transfers WHERE from_category_id = ? OR to_category_id = ? LIMIT 1",
      [id, id]
    );
    return !!transfer;
  }
}
