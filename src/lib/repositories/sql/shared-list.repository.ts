import { all, get, run, lastInsertId } from "@/lib/db";
import { getRequestContext } from "@/lib/db/request-context";
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
    created_at AS "createdAt"
  FROM shared_lists
`;

interface SharedListRow {
  id: number;
  name: string;
  visibility: ListVisibility;
  ownerUserId: number | null;
  sortOrder: number;
  createdAt: string;
}

function toSharedList(r: SharedListRow): SharedList {
  return {
    id: r.id,
    name: r.name,
    visibility: r.visibility,
    ownerUserId: r.ownerUserId,
    sortOrder: r.sortOrder,
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
    const userId = this.getUserIdOrNull();
    const visibility = options?.visibility;

    const params: (string | number | boolean | null)[] = [];
    let whereSql = "";

    if (visibility === "shared") {
      whereSql = "WHERE visibility = 'shared'";
    } else if (visibility === "personal") {
      if (userId == null) return [];
      whereSql = "WHERE visibility = 'personal' AND owner_user_id = ?";
      params.push(userId);
    } else {
      // Default: both shared and current user's personal lists.
      if (userId == null) {
        whereSql = "WHERE visibility = 'shared'";
      } else {
        whereSql =
          "WHERE visibility = 'shared' OR (visibility = 'personal' AND owner_user_id = ?)";
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
    const userId = this.getUserIdOrNull();
    const row = await (userId == null
      ? get<SharedListRow>(
          `${SELECT_FIELDS} WHERE id = ? AND visibility = 'shared'`,
          [id]
        )
      : get<SharedListRow>(
          `${SELECT_FIELDS} WHERE id = ? AND (visibility = 'shared' OR (visibility = 'personal' AND owner_user_id = ?))`,
          [id, userId]
        ));
    return row ? toSharedList(row) : null;
  }

  async create(data: CreateSharedListInput): Promise<{ id: number }> {
    const userId = this.getUserIdOrNull();
    const visibility: ListVisibility = data.visibility ?? "shared";
    const ownerUserId =
      visibility === "personal" ? (userId ?? null) : null;

    if (visibility === "personal" && ownerUserId == null) {
      throw new Error("Unauthorized");
    }

    await run(
      `INSERT INTO shared_lists (name, sort_order, visibility, owner_user_id) VALUES (?, ?, ?, ?)`,
      [data.name, data.sortOrder ?? 0, visibility, ownerUserId]
    );
    return { id: await lastInsertId() };
  }

  async update(id: number, data: UpdateSharedListInput): Promise<void> {
    const updates: string[] = [];
    const params: (string | number)[] = [];
    if (data.name != null) {
      updates.push("name = ?");
      params.push(data.name);
    }
    if (data.sortOrder !== undefined) {
      updates.push("sort_order = ?");
      params.push(data.sortOrder);
    }
    if (updates.length === 0) return;
    params.push(id);
    await run(
      `UPDATE shared_lists SET ${updates.join(", ")} WHERE id = ?`,
      params
    );
  }

  async delete(id: number): Promise<void> {
    const itemRows = await all<{ id: number }>(
      "SELECT id FROM shared_list_items WHERE list_id = ?",
      [id]
    );
    await noteRepo.deleteAllForLinkedTargets(
      NOTE_LINKED_TYPE_SHARED_LIST_ITEM,
      itemRows.map((r) => r.id)
    );
    await run("DELETE FROM shared_lists WHERE id = ?", [id]);
  }
}
