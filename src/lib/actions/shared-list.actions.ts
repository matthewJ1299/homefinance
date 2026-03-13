"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/db/request-context";
import {
  getSharedListRepository,
  getSharedListItemRepository,
} from "@/lib/repositories";
import {
  createSharedListSchema,
  updateSharedListSchema,
} from "@/lib/validators/shared-list.schema";
import {
  createSharedListItemSchema,
  updateSharedListItemSchema,
} from "@/lib/validators/shared-list-item.schema";

export type SharedListActionResult =
  | { success: true; id?: number }
  | { success: false; error: string };

export async function createList(formData: {
  name: string;
  sortOrder?: number;
}): Promise<SharedListActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContext({
    userId: session.user.id,
    userName: session.user.name ?? undefined,
  });
  const parsed = createSharedListSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.message };
  const repo = getSharedListRepository();
  try {
    const list = await repo.create(parsed.data);
    revalidatePath("/lists");
    return { success: true, id: list.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create list";
    return { success: false, error: message };
  }
}

export async function updateList(
  id: number,
  formData: { name?: string; sortOrder?: number }
): Promise<SharedListActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContext({
    userId: session.user.id,
    userName: session.user.name ?? undefined,
  });
  const parsed = updateSharedListSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.message };
  const updates = parsed.data;
  if (!updates || Object.keys(updates).length === 0) return { success: true };
  const repo = getSharedListRepository();
  const exists = await repo.findById(id);
  if (!exists) return { success: false, error: "List not found" };
  try {
    await repo.update(id, updates);
    revalidatePath("/lists");
    revalidatePath(`/lists/${id}`);
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update list";
    return { success: false, error: message };
  }
}

export async function deleteList(id: number): Promise<SharedListActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContext({
    userId: session.user.id,
    userName: session.user.name ?? undefined,
  });
  const repo = getSharedListRepository();
  const exists = await repo.findById(id);
  if (!exists) return { success: false, error: "List not found" };
  try {
    await repo.delete(id);
    revalidatePath("/lists");
    revalidatePath(`/lists/${id}`);
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete list";
    return { success: false, error: message };
  }
}

export async function createListItem(
  listId: number,
  formData: { label: string; quantity?: number }
): Promise<SharedListActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContext({
    userId: session.user.id,
    userName: session.user.name ?? undefined,
  });
  const parsed = createSharedListItemSchema.safeParse({ ...formData, listId });
  if (!parsed.success) return { success: false, error: parsed.error.message };
  const listRepo = getSharedListRepository();
  const exists = await listRepo.findById(listId);
  if (!exists) return { success: false, error: "List not found" };
  const itemRepo = getSharedListItemRepository();
  try {
    const item = await itemRepo.create(parsed.data);
    revalidatePath("/lists");
    revalidatePath(`/lists/${listId}`);
    try {
      const { NotificationService, isNotificationConfigured } = await import(
        "@/lib/services/notification.service"
      );
      if (isNotificationConfigured()) {
        const notificationService = new NotificationService();
        const userName = session.user.name ?? "Someone";
        const listName = exists.name;
        const label = parsed.data.label ?? "an item";
        await notificationService.sendToAllExcept(Number(session.user.id), {
          title: "HomeFinance",
          body: `${userName} added "${label}" to ${listName}`,
          url: "/lists",
        });
      }
    } catch {
      // Notification failure must not affect the primary operation
    }
    return { success: true, id: item.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to add item";
    return { success: false, error: message };
  }
}

export async function updateListItem(
  id: number,
  formData: { label?: string; quantity?: number; completed?: boolean }
): Promise<SharedListActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContext({
    userId: session.user.id,
    userName: session.user.name ?? undefined,
  });
  const parsed = updateSharedListItemSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.message };
  const updates = parsed.data;
  if (!updates || Object.keys(updates).length === 0) return { success: true };
  const itemRepo = getSharedListItemRepository();
  const existing = await itemRepo.findById(id);
  if (!existing) return { success: false, error: "Item not found" };
  try {
    await itemRepo.update(id, updates);
    revalidatePath(`/lists/${existing.listId}`);
    revalidatePath("/lists");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update item";
    return { success: false, error: message };
  }
}

export async function deleteListItem(id: number): Promise<SharedListActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContext({
    userId: session.user.id,
    userName: session.user.name ?? undefined,
  });
  const itemRepo = getSharedListItemRepository();
  const existing = await itemRepo.findById(id);
  if (!existing) return { success: false, error: "Item not found" };
  try {
    await itemRepo.delete(id);
    revalidatePath(`/lists/${existing.listId}`);
    revalidatePath("/lists");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete item";
    return { success: false, error: message };
  }
}

export async function deleteCompletedListItems(
  listId: number
): Promise<SharedListActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContext({
    userId: session.user.id,
    userName: session.user.name ?? undefined,
  });
  const listRepo = getSharedListRepository();
  const exists = await listRepo.findById(listId);
  if (!exists) return { success: false, error: "List not found" };
  const itemRepo = getSharedListItemRepository();
  try {
    await itemRepo.deleteCompletedByListId(listId);
    revalidatePath("/lists");
    revalidatePath(`/lists/${listId}`);
    return { success: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to delete completed items";
    return { success: false, error: message };
  }
}
