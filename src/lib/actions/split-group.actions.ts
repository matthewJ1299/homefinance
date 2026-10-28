"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { getSplitGroupRepository } from "@/lib/repositories";
import {
  createSplitGroupSchema,
  updateSplitGroupSchema,
} from "@/lib/validators/split-group.schema";

export type SplitGroupActionResult =
  | { success: true; id?: number }
  | { success: false; error: string };

export async function createSplitGroup(formData: {
  name: string;
  isDefault?: boolean;
  sortOrder?: number;
}): Promise<SplitGroupActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContextFromSession(session);
  const parsed = createSplitGroupSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.message };
  const repo = getSplitGroupRepository();
  try {
    const group = await repo.create(parsed.data);
    revalidatePath("/split-groups");
    revalidatePath("/settings");
    revalidatePath("/splits");
    revalidatePath("/dashboard");
    return { success: true, id: group.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create split group";
    if (message.includes("UNIQUE") || message.includes("unique")) {
      return { success: false, error: "A split group with this name already exists." };
    }
    return { success: false, error: message };
  }
}

export async function updateSplitGroup(
  id: number,
  formData: { name?: string; isDefault?: boolean; sortOrder?: number }
): Promise<SplitGroupActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContextFromSession(session);
  const parsed = updateSplitGroupSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.message };
  const updates = parsed.data;
  if (Object.keys(updates).length === 0) return { success: true };
  const repo = getSplitGroupRepository();
  try {
    await repo.update(id, updates);
    revalidatePath("/split-groups");
    revalidatePath("/settings");
    revalidatePath("/splits");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update split group";
    if (message.includes("UNIQUE") || message.includes("unique")) {
      return { success: false, error: "A split group with this name already exists." };
    }
    return { success: false, error: message };
  }
}

export async function reorderSplitGroup(
  id: number,
  direction: "up" | "down"
): Promise<SplitGroupActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContextFromSession(session);
  const repo = getSplitGroupRepository();
  const list = await repo.findAll();
  const index = list.findIndex((g) => g.id === id);
  if (index === -1) return { success: false, error: "Split group not found" };
  const neighbourIndex = direction === "up" ? index - 1 : index + 1;
  if (neighbourIndex < 0 || neighbourIndex >= list.length) return { success: true };
  const current = list[index]!;
  const neighbour = list[neighbourIndex]!;
  try {
    await repo.update(id, { sortOrder: neighbour.sortOrder });
    await repo.update(neighbour.id, { sortOrder: current.sortOrder });
    revalidatePath("/split-groups");
    revalidatePath("/settings");
    revalidatePath("/splits");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to reorder";
    return { success: false, error: message };
  }
}

export async function deleteSplitGroup(id: number): Promise<SplitGroupActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContextFromSession(session);
  const repo = getSplitGroupRepository();
  const exists = await repo.findById(id);
  if (!exists) return { success: false, error: "Split group not found" };
  const inUse = await repo.isInUse(id);
  if (inUse) {
    return {
      success: false,
      error:
        "Cannot delete: this group has split expenses or settlements. Move or settle them first.",
    };
  }
  try {
    await repo.delete(id);
    revalidatePath("/split-groups");
    revalidatePath("/settings");
    revalidatePath("/splits");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete split group";
    return { success: false, error: message };
  }
}
