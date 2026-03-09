import { all, get, run, lastInsertId } from "@/lib/db";
import type { SharedListItem } from "../interfaces/shared-list-item.repository";
import type {
  ISharedListItemRepository,
  CreateSharedListItemInput,
  UpdateSharedListItemInput,
} from "../interfaces/shared-list-item.repository";

const SELECT_FIELDS = `
  SELECT id, list_id AS "listId", label, quantity, completed, sort_order AS "sortOrder", created_at AS "createdAt"
  FROM shared_list_items
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
    const rows = await all<SharedListItemRow>(
      `${SELECT_FIELDS} WHERE list_id = ? ORDER BY completed ASC, sort_order ASC, id ASC`,
      [listId]
    );
    return rows.map(toSharedListItem);
  }

  async findById(id: number): Promise<SharedListItem | null> {
    const row = await get<SharedListItemRow>(
      `${SELECT_FIELDS} WHERE id = ?`,
      [id]
    );
    return row ? toSharedListItem(row) : null;
  }

  async create(data: CreateSharedListItemInput): Promise<{ id: number }> {
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
    const row = await get<{ max: number | null }>(
      `SELECT MAX(sort_order) AS max FROM shared_list_items WHERE list_id = ?`,
      [listId]
    );
    return (row?.max ?? 0) + 1;
  }

  async update(id: number, data: UpdateSharedListItemInput): Promise<void> {
    if (data.completed === true) {
      const item = await get<SharedListItemRow>(
        `SELECT list_id AS "listId" FROM shared_list_items WHERE id = ?`,
        [id]
      );
      if (item) {
        const nextOrder = await this.getNextSortOrderForList(item.listId);
        await run(
          `UPDATE shared_list_items SET completed = true, sort_order = ? WHERE id = ?`,
          [nextOrder, id]
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
    params.push(id);
    await run(
      `UPDATE shared_list_items SET ${updates.join(", ")} WHERE id = ?`,
      params
    );
  }

  async delete(id: number): Promise<void> {
    await run("DELETE FROM shared_list_items WHERE id = ?", [id]);
  }

  async deleteCompletedByListId(listId: number): Promise<void> {
    await run(
      "DELETE FROM shared_list_items WHERE list_id = ? AND completed = true",
      [listId]
    );
  }
}
