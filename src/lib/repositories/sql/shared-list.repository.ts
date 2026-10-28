import { all, get, run, lastInsertId } from "@/lib/db";
import { getRequestContext, requireHouseholdId } from "@/lib/db/request-context";
import { NOTE_LINKED_TYPE_SHARED_LIST_ITEM } from "@/lib/types/note-linked-types";
import { NoteRepository } from "./note.repository";
import type { SharedList } from "../interfaces/shared-list.repository";
import type {
  ISharedListRepository,
  CreateSharedListInput,
  UpdateSharedListInput,
} from "../interfaces/shared-list.repository";

import type { ListVisibility } from "../interfaces/shared-list.repository";

const noteRepo = new NoteRepository();

const SELECT_FIELDS = `
  SELECT
    id,
    name,
    visibility,
    owner_user_id AS "ownerUserId",
    sort_order AS "sortOrder",
    category_id AS "categoryId",
    created_at AS "createdAt"
  FROM shared_lists
`;

interface SharedListRow {
  id: number;
  name: string;
  visibility: ListVisibility;
  ownerUserId: number | null;
  sortOrder: number;
  categoryId: number | null;
  createdAt: string;
}

function toSharedList(r: SharedListRow): SharedList {
  return {
    id: r.id,
    name: r.name,
    visibility: r.visibility,
    ownerUserId: r.ownerUserId,
    sortOrder: r.sortOrder,
    categoryId: r.categoryId ?? null,
    createdAt: r.createdAt,
  };
}

export class SharedListRepository implements ISharedListRepository {
  private getUserIdOrNull(): number | null {
    const ctx = getRequestContext();
    const raw = ctx?.userId;
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) ? id : null;
  }

  async findAll(options?: { visibility?: ListVisibility }): Promise<SharedList[]> {
    const hid = requireHouseholdId();
    const userId = this.getUserIdOrNull();
    const visibility = options?.visibility;

    const params: (string | number | boolean | null)[] = [hid];
    let whereSql = "WHERE household_id = ?";

    if (visibility === "shared") {
      whereSql += " AND visibility = 'shared'";
    } else if (visibility === "personal") {
      if (userId == null) return [];
      whereSql += " AND visibility = 'personal' AND owner_user_id = ?";
      params.push(userId);
    } else {
      if (userId == null) {
        whereSql += " AND visibility = 'shared'";
      } else {
        whereSql +=
          " AND (visibility = 'shared' OR (visibility = 'personal' AND owner_user_id = ?))";
        params.push(userId);
      }
    }

    const rows = await all<SharedListRow>(
      `${SELECT_FIELDS} ${whereSql} ORDER BY sort_order ASC, id ASC`,
      params
    );
    return rows.map(toSharedList);
  }

  async findById(id: number): Promise<SharedList | null> {
    const hid = requireHouseholdId();
    const userId = this.getUserIdOrNull();
    const row = await (userId == null
      ? get<SharedListRow>(
          `${SELECT_FIELDS} WHERE id = ? AND household_id = ? AND visibility = 'shared'`,
          [id, hid]
        )
      : get<SharedListRow>(
          `${SELECT_FIELDS} WHERE id = ? AND household_id = ? AND (visibility = 'shared' OR (visibility = 'personal' AND owner_user_id = ?))`,
          [id, hid, userId]
        ));
    return row ? toSharedList(row) : null;
  }

  async create(data: CreateSharedListInput): Promise<{ id: number }> {
    const hid = requireHouseholdId();
    const userId = this.getUserIdOrNull();
    const visibility: ListVisibility = data.visibility ?? "shared";
    const ownerUserId =
      visibility === "personal" ? (userId ?? null) : null;

    if (visibility === "personal" && ownerUserId == null) {
      throw new Error("Unauthorized");
    }

    await run(
      `INSERT INTO shared_lists (name, sort_order, visibility, owner_user_id, household_id) VALUES (?, ?, ?, ?, ?)`,
      [data.name, data.sortOrder ?? 0, visibility, ownerUserId, hid]
    );
    return { id: await lastInsertId() };
  }

  async update(id: number, data: UpdateSharedListInput): Promise<void> {
    const hid = requireHouseholdId();
    const updates: string[] = [];
    const params: (string | number | null)[] = [];
    if (data.name != null) {
      updates.push("name = ?");
      params.push(data.name);
    }
    if (data.sortOrder !== undefined) {
      updates.push("sort_order = ?");
      params.push(data.sortOrder);
    }
    if (data.categoryId !== undefined) {
      updates.push("category_id = ?");
      params.push(data.categoryId);
    }
    if (updates.length === 0) return;
    params.push(id, hid);
    await run(
      `UPDATE shared_lists SET ${updates.join(", ")} WHERE id = ? AND household_id = ?`,
      params
    );
  }

  async delete(id: number): Promise<void> {
    const hid = requireHouseholdId();
    const itemRows = await all<{ id: number }>(
      "SELECT id FROM shared_list_items WHERE list_id = ?",
      [id]
    );
    await noteRepo.deleteAllForLinkedTargets(
      NOTE_LINKED_TYPE_SHARED_LIST_ITEM,
      itemRows.map((r) => r.id)
    );
    await run("DELETE FROM shared_lists WHERE id = ? AND household_id = ?", [id, hid]);
  }
}
