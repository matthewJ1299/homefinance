import { getNoteRepository } from "@/lib/repositories";
import type { SharedListItem } from "@/lib/repositories/interfaces/shared-list-item.repository";
import type { Note } from "@/lib/types/note";
import { NOTE_LINKED_TYPE_SHARED_LIST_ITEM } from "@/lib/types/note-linked-types";

export async function notesByItemIdForUser(
  ownerUserId: number,
  items: SharedListItem[]
): Promise<Record<number, Note[]>> {
  const realIds = [...new Set(items.map((i) => i.id).filter((id) => id > 0))];
  if (realIds.length === 0) return {};
  const map = await getNoteRepository().listForTargets(
    ownerUserId,
    NOTE_LINKED_TYPE_SHARED_LIST_ITEM,
    realIds
  );
  const out: Record<number, Note[]> = {};
  for (const id of realIds) {
    out[id] = map.get(id) ?? [];
  }
  return out;
}
