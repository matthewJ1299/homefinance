"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getCategoryRepository } from "@/lib/repositories";
import { createCategorySchema, updateCategorySchema } from "@/lib/validators/category.schema";

export type CategoryActionResult =
  | { success: true; id?: number }
  | { success: false; error: string };

export async function createCategory(formData: {
  name: string;
  groupName: string;
  costType?: "fixed" | "variable";
  defaultAmount?: number | null;
}): Promise<CategoryActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const parsed = createCategorySchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.message };
  const repo = getCategoryRepository();
  try {
    const category = await repo.create(parsed.data);
    revalidatePath("/categories");
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/budget");
    return { success: true, id: category.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create category";
    if (message.includes("UNIQUE") || message.includes("unique")) {
      return { success: false, error: "A category with this name already exists." };
    }
    return { success: false, error: message };
  }
}

export async function updateCategory(
  id: number,
  formData: {
    name?: string;
    groupName?: string;
    isActive?: boolean;
    sortOrder?: number;
    costType?: "fixed" | "variable";
    defaultAmount?: number | null;
  }
): Promise<CategoryActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const parsed = updateCategorySchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.message };
  const updates = parsed.data;
  if (Object.keys(updates).length === 0) return { success: true };
  const repo = getCategoryRepository();
  try {
    await repo.update(id, updates);
    revalidatePath("/categories");
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/budget");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update category";
    if (message.includes("UNIQUE") || message.includes("unique")) {
      return { success: false, error: "A category with this name already exists." };
    }
    return { success: false, error: message };
  }
}

export async function reorderCategory(
  id: number,
  direction: "up" | "down"
): Promise<CategoryActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const repo = getCategoryRepository();
  const list = await repo.findAllIncludingInactive();
  const index = list.findIndex((c) => c.id === id);
  if (index === -1) return { success: false, error: "Category not found" };
  const neighbourIndex = direction === "up" ? index - 1 : index + 1;
  if (neighbourIndex < 0 || neighbourIndex >= list.length) return { success: true };
  const current = list[index]!;
  const neighbour = list[neighbourIndex]!;
  try {
    await repo.update(id, { sortOrder: neighbour.sortOrder });
    await repo.update(neighbour.id, { sortOrder: current.sortOrder });
    revalidatePath("/categories");
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/budget");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to reorder";
    return { success: false, error: message };
  }
}

/**
 * Persist category order from a drag-and-drop (or other) reorder.
 * orderedCategoryIds must be the full list of active category IDs in the desired order.
 */
export async function reorderCategories(
  orderedCategoryIds: number[]
): Promise<CategoryActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  if (orderedCategoryIds.length === 0) return { success: true };
  const repo = getCategoryRepository();
  const active = await repo.findAll();
  const activeIds = new Set(active.map((c) => c.id));
  const orderedSet = new Set(orderedCategoryIds);
  if (
    orderedSet.size !== orderedCategoryIds.length ||
    orderedCategoryIds.some((id) => !activeIds.has(id))
  ) {
    return { success: false, error: "Invalid category order" };
  }
  try {
    for (let i = 0; i < orderedCategoryIds.length; i++) {
      await repo.update(orderedCategoryIds[i]!, { sortOrder: i });
    }
    revalidatePath("/categories");
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/budget");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to reorder categories";
    return { success: false, error: message };
  }
}

/**
 * Permanently delete a category. Fails if the category has any expenses,
 * budget allocations, or transfers.
 */
export async function deleteCategory(id: number): Promise<CategoryActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const repo = getCategoryRepository();
  const exists = await repo.findById(id);
  if (!exists) return { success: false, error: "Category not found" };
  const inUse = await repo.isInUse(id);
  if (inUse) {
    return {
      success: false,
      error:
        "Cannot delete: this category has expenses, budget allocations, or transfers. Deactivate it instead.",
    };
  }
  try {
    await repo.delete(id);
    revalidatePath("/categories");
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/budget");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete category";
    return { success: false, error: message };
  }
}
