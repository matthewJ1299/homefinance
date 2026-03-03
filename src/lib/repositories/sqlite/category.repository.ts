import { eq, desc, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, expenses, budgets, budgetTransfers } from "@/lib/db/schema";
import type { Category, CategoryWithActive } from "@/lib/types";
import type { ICategoryRepository } from "../interfaces/category.repository";

export class CategoryRepository implements ICategoryRepository {
  async findAll(): Promise<Category[]> {
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        groupName: categories.groupName,
        icon: categories.icon,
        sortOrder: categories.sortOrder,
        costType: categories.costType,
        defaultAmount: categories.defaultAmount,
      })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(desc(categories.costType), categories.sortOrder, categories.name);
    return rows as Category[];
  }

  async findAllIncludingInactive(): Promise<CategoryWithActive[]> {
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        groupName: categories.groupName,
        icon: categories.icon,
        sortOrder: categories.sortOrder,
        isActive: categories.isActive,
        costType: categories.costType,
        defaultAmount: categories.defaultAmount,
      })
      .from(categories)
      .orderBy(desc(categories.isActive), desc(categories.costType), categories.sortOrder, categories.name);
    return rows as CategoryWithActive[];
  }

  async findById(id: number): Promise<Category | null> {
    const [row] = await db
      .select({
        id: categories.id,
        name: categories.name,
        groupName: categories.groupName,
        icon: categories.icon,
        sortOrder: categories.sortOrder,
        costType: categories.costType,
        defaultAmount: categories.defaultAmount,
      })
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    return (row as Category) ?? null;
  }

  async findByName(name: string): Promise<Category | null> {
    const [row] = await db
      .select({
        id: categories.id,
        name: categories.name,
        groupName: categories.groupName,
        icon: categories.icon,
        sortOrder: categories.sortOrder,
        costType: categories.costType,
        defaultAmount: categories.defaultAmount,
      })
      .from(categories)
      .where(eq(categories.name, name))
      .limit(1);
    return (row as Category) ?? null;
  }

  async create(data: {
    name: string;
    groupName: string;
    icon?: string;
    sortOrder?: number;
    costType?: "fixed" | "variable";
    defaultAmount?: number | null;
  }): Promise<Category> {
    const [inserted] = await db
      .insert(categories)
      .values({
        name: data.name,
        groupName: data.groupName,
        icon: data.icon ?? null,
        sortOrder: data.sortOrder ?? 0,
        costType: data.costType ?? "variable",
        defaultAmount: data.defaultAmount ?? null,
      })
      .returning();
    return {
      id: inserted!.id,
      name: inserted!.name,
      groupName: inserted!.groupName,
      icon: inserted!.icon,
      sortOrder: inserted!.sortOrder,
      costType: inserted!.costType as "fixed" | "variable",
      defaultAmount: inserted!.defaultAmount,
    };
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
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.groupName !== undefined) updates.groupName = data.groupName;
    if (data.isActive !== undefined) updates.isActive = data.isActive;
    if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;
    if (data.costType !== undefined) updates.costType = data.costType;
    if (data.defaultAmount !== undefined) updates.defaultAmount = data.defaultAmount;
    if (Object.keys(updates).length === 0) return;
    await db.update(categories).set(updates).where(eq(categories.id, id));
  }

  async delete(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async isInUse(id: number): Promise<boolean> {
    const [expense] = await db
      .select({ id: expenses.id })
      .from(expenses)
      .where(eq(expenses.categoryId, id))
      .limit(1);
    if (expense) return true;
    const [budget] = await db
      .select({ id: budgets.id })
      .from(budgets)
      .where(eq(budgets.categoryId, id))
      .limit(1);
    if (budget) return true;
    const [transfer] = await db
      .select({ id: budgetTransfers.id })
      .from(budgetTransfers)
      .where(
        or(
          eq(budgetTransfers.fromCategoryId, id),
          eq(budgetTransfers.toCategoryId, id)
        )
      )
      .limit(1);
    return !!transfer;
  }
}
