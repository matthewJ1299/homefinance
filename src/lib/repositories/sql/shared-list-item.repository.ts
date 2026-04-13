import { all, get, run, lastInsertId } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import { NOTE_LINKED_TYPE_SHARED_LIST_ITEM } from "@/lib/types/note-linked-types";
import type { SharedListItem } from "../interfaces/shared-list-item.repository";
import type {
  ISharedListItemRepository,
  CreateSharedListItemInput,
  UpdateSharedListItemInput,
} from "../interfaces/shared-list-item.repository";
import { NoteRepository } from "./note.repository";

const noteRepo = new NoteRepository();

const SELECT_FIELDS = `
  SELECT i.id, i.list_id AS "listId", i.label, i.quantity, i.completed, i.sort_order AS "sortOrder", i.created_at AS "createdAt"
  FROM shared_list_items i
  INNER JOIN shared_lists sl ON i.list_id = sl.id
`;

interface SharedListItemRow {
  id: number;
  listId: number;
  label: string;
  quantity: number;
  completed: boolean;
  sortOrder: number;
  createdAt: string;
}

function toSharedListItem(r: SharedListItemRow): SharedListItem {
  return {
    id: r.id,
    listId: r.listId,
    label: r.label,
    quantity: r.quantity,
    completed: r.completed,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt,
  };
}

export class SharedListItemRepository implements ISharedListItemRepository {
  async findByListId(listId: number): Promise<SharedListItem[]> {
    const hid = requireHouseholdId();
    const rows = await all<SharedListItemRow>(
      `${SELECT_FIELDS} WHERE sl.household_id = ? AND i.list_id = ? ORDER BY i.completed ASC, i.sort_order ASC, i.id ASC`,
      [hid, listId]
    );
    return rows.map(toSharedListItem);
  }

  async findById(id: number): Promise<SharedListItem | null> {
    const hid = requireHouseholdId();
    const row = await get<SharedListItemRow>(
      `${SELECT_FIELDS} WHERE sl.household_id = ? AND i.id = ?`,
      [hid, id]
    );
    return row ? toSharedListItem(row) : null;
  }

  async create(data: CreateSharedListItemInput): Promise<{ id: number }> {
    const hid = requireHouseholdId();
    const listOk = await get<{ id: number }>(
      "SELECT id FROM shared_lists WHERE id = ? AND household_id = ? LIMIT 1",
      [data.listId, hid]
    );
    if (!listOk) {
      throw new Error("List not found for this household");
    }
    const sortOrder =
      data.sortOrder ??
      (await this.getNextSortOrderForList(data.listId));
    await run(
      `INSERT INTO shared_list_items (list_id, label, quantity, sort_order) VALUES (?, ?, ?, ?)`,
      [data.listId, data.label, data.quantity ?? 1, sortOrder]
    );
    return { id: await lastInsertId() };
  }

  private async getNextSortOrderForList(listId: number): Promise<number> {
    const hid = requireHouseholdId();
    const row = await get<{ max: number | null }>(
      `SELECT MAX(i.sort_order) AS max
       FROM shared_list_items i
       INNER JOIN shared_lists sl ON i.list_id = sl.id
       WHERE sl.household_id = ? AND i.list_id = ?`,
      [hid, listId]
    );
    return (row?.max ?? 0) + 1;
  }

  async update(id: number, data: UpdateSharedListItemInput): Promise<void> {
    const hid = requireHouseholdId();
    if (data.completed === true) {
      const item = await get<SharedListItemRow>(
        `SELECT i.list_id AS "listId"
         FROM shared_list_items i
         INNER JOIN shared_lists sl ON i.list_id = sl.id
         WHERE sl.household_id = ? AND i.id = ?`,
        [hid, id]
      );
      if (item) {
        const nextOrder = await this.getNextSortOrderForList(item.listId);
        await run(
          `UPDATE shared_list_items SET completed = true, sort_order = ?
           WHERE id = ? AND list_id IN (SELECT id FROM shared_lists WHERE household_id = ?)`,
          [nextOrder, id, hid]
        );
        return;
      }
    }

    const updates: string[] = [];
    const params: (string | number | boolean)[] = [];
    if (data.label != null) {
      updates.push("label = ?");
      params.push(data.label);
    }
    if (data.quantity !== undefined) {
      updates.push("quantity = ?");
      params.push(data.quantity);
    }
    if (data.completed !== undefined) {
      updates.push("completed = ?");
      params.push(data.completed);
    }
    if (data.sortOrder !== undefined) {
      updates.push("sort_order = ?");
      params.push(data.sortOrder);
    }
    if (updates.length === 0) return;
    params.push(id, hid);
    await run(
      `UPDATE shared_list_items SET ${updates.join(", ")}
       WHERE id = ? AND list_id IN (SELECT id FROM shared_lists WHERE household_id = ?)`,
      params
    );
  }

  async delete(id: number): Promise<void> {
    await noteRepo.deleteAllForLinkedTarget(NOTE_LINKED_TYPE_SHARED_LIST_ITEM, id);
    const hid = requireHouseholdId();
    await run(
      `DELETE FROM shared_list_items WHERE id = ? AND list_id IN (SELECT id FROM shared_lists WHERE household_id = ?)`,
      [id, hid]
    );
  }

  async deleteCompletedByListId(listId: number): Promise<void> {
    const hid = requireHouseholdId();
    const completedRows = await all<{ id: number }>(
      `SELECT i.id FROM shared_list_items i
       INNER JOIN shared_lists sl ON i.list_id = sl.id
       WHERE sl.household_id = ? AND i.list_id = ? AND i.completed = true`,
      [hid, listId]
    );
    await noteRepo.deleteAllForLinkedTargets(
      NOTE_LINKED_TYPE_SHARED_LIST_ITEM,
      completedRows.map((r) => r.id)
    );
    await run(
      `DELETE FROM shared_list_items WHERE list_id = ? AND completed = true
       AND list_id IN (SELECT id FROM shared_lists WHERE household_id = ?)`,
      [listId, hid]
    );
  }
}
