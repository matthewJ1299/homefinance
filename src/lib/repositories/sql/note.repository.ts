import { all, get, lastInsertId, run } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import type { Note } from "@/lib/types/note";
import type {
  CreateNoteInput,
  INoteRepository,
  UpdateNoteInput,
} from "../interfaces/note.repository";

interface NoteRow {
  id: number | string;
  owner_user_id: number | string;
  linked_type: string;
  linked_id: number | string;
  body: string;
  created_at: string;
  updated_at: string;
}

function toNote(row: NoteRow): Note {
  return {
    id: Number(row.id),
    ownerUserId: Number(row.owner_user_id),
    linkedType: row.linked_type,
    linkedId: Number(row.linked_id),
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class NoteRepository implements INoteRepository {
  async create(ownerUserId: number, input: CreateNoteInput): Promise<{ id: number }> {
    const hid = requireHouseholdId();
    await run(
      `INSERT INTO notes (owner_user_id, linked_type, linked_id, body, household_id)
       VALUES (?, ?, ?, ?, ?)`,
      [ownerUserId, input.linkedType, input.linkedId, input.body, hid]
    );
    return { id: await lastInsertId() };
  }

  async findById(id: number, ownerUserId: number): Promise<Note | null> {
    const hid = requireHouseholdId();
    const row = await get<NoteRow>(
      `SELECT id, owner_user_id, linked_type, linked_id, body, created_at, updated_at
       FROM notes
       WHERE id = ? AND owner_user_id = ? AND household_id = ?`,
      [id, ownerUserId, hid]
    );
    return row ? toNote(row) : null;
  }

  async listForTarget(
    ownerUserId: number,
    linkedType: string,
    linkedId: number
  ): Promise<Note[]> {
    const hid = requireHouseholdId();
    const rows = await all<NoteRow>(
      `SELECT id, owner_user_id, linked_type, linked_id, body, created_at, updated_at
       FROM notes
       WHERE owner_user_id = ? AND linked_type = ? AND linked_id = ? AND household_id = ?
       ORDER BY created_at ASC, id ASC`,
      [ownerUserId, linkedType, linkedId, hid]
    );
    return rows.map(toNote);
  }

  async listForTargets(
    ownerUserId: number,
    linkedType: string,
    linkedIds: number[]
  ): Promise<Map<number, Note[]>> {
    const hid = requireHouseholdId();
    const byId = new Map<number, Note[]>();
    if (linkedIds.length === 0) return byId;
    const placeholders = linkedIds.map(() => "?").join(", ");
    const rows = await all<NoteRow>(
      `SELECT id, owner_user_id, linked_type, linked_id, body, created_at, updated_at
       FROM notes
       WHERE owner_user_id = ? AND linked_type = ? AND household_id = ? AND linked_id IN (${placeholders})
       ORDER BY linked_id ASC, created_at ASC, id ASC`,
      [ownerUserId, linkedType, hid, ...linkedIds]
    );
    for (const row of rows) {
      const note = toNote(row);
      const list = byId.get(note.linkedId) ?? [];
      list.push(note);
      byId.set(note.linkedId, list);
    }
    return byId;
  }

  async update(id: number, ownerUserId: number, input: UpdateNoteInput): Promise<void> {
    const updates: string[] = [];
    const params: (string | number | boolean | null)[] = [];

    if (input.body !== undefined) {
      updates.push("body = ?");
      params.push(input.body);
    }

    if (updates.length === 0) return;

    const hid = requireHouseholdId();
    updates.push("updated_at = NOW()");
    params.push(id, ownerUserId, hid);
    await run(
      `UPDATE notes SET ${updates.join(", ")} WHERE id = ? AND owner_user_id = ? AND household_id = ?`,
      params
    );
  }

  async delete(id: number, ownerUserId: number): Promise<void> {
    const hid = requireHouseholdId();
    await run("DELETE FROM notes WHERE id = ? AND owner_user_id = ? AND household_id = ?", [
      id,
      ownerUserId,
      hid,
    ]);
  }

  async deleteAllForOwnerAndTarget(
    ownerUserId: number,
    linkedType: string,
    linkedId: number
  ): Promise<void> {
    const hid = requireHouseholdId();
    await run(
      "DELETE FROM notes WHERE owner_user_id = ? AND linked_type = ? AND linked_id = ? AND household_id = ?",
      [ownerUserId, linkedType, linkedId, hid]
    );
  }

  async deleteAllForLinkedTarget(linkedType: string, linkedId: number): Promise<void> {
    const hid = requireHouseholdId();
    await run("DELETE FROM notes WHERE linked_type = ? AND linked_id = ? AND household_id = ?", [
      linkedType,
      linkedId,
      hid,
    ]);
  }

  async deleteAllForLinkedTargets(linkedType: string, linkedIds: number[]): Promise<void> {
    if (linkedIds.length === 0) return;
    const hid = requireHouseholdId();
    const placeholders = linkedIds.map(() => "?").join(", ");
    await run(
      `DELETE FROM notes WHERE household_id = ? AND linked_type = ? AND linked_id IN (${placeholders})`,
      [hid, linkedType, ...linkedIds]
    );
  }
}
