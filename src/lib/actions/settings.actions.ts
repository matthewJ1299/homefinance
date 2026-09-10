"use server";

import { authedAction } from "@/lib/actions/_shared/authed-action";
import {
  getSharedListItemRepository,
  getSharedListRepository,
} from "@/lib/repositories";
import { notesByItemIdForUser } from "@/lib/shared-lists/load-item-notes";
import type { SharedListItem } from "@/lib/repositories/interfaces/shared-list-item.repository";
import type { Note } from "@/lib/types/note";

export type SettingsListItemsPayload = {
  itemsByListId: Record<number, SharedListItem[]>;
  notesByItemId: Record<number, Note[]>;
};

export async function loadSettingsListItemsAction(): Promise<
  { success: true; data: SettingsListItemsPayload } | { success: false; error: string }
> {
  return authedAction<{ success: true; data: SettingsListItemsPayload }>(
    async ({ userId }) => {
      const lists = await getSharedListRepository().findAll();
      const itemRepo = getSharedListItemRepository();
      const itemsByListId: Record<number, SharedListItem[]> = {};
      await Promise.all(
        lists.map(async (list) => {
          itemsByListId[list.id] = await itemRepo.findByListId(list.id);
        })
      );
      const notesByItemId = await notesByItemIdForUser(
        userId,
        Object.values(itemsByListId).flat()
      );
      return { success: true, data: { itemsByListId, notesByItemId } };
    },
    { onError: "Those lists didn't load. Try again." }
  );
}
