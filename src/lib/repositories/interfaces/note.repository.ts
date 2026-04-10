import type { Note } from "@/lib/types/note";

export interface CreateNoteInput {
  linkedType: string;
  linkedId: number;
  body: string;
}

export interface UpdateNoteInput {
  body?: string;
}

export interface INoteRepository {
  create(ownerUserId: number, input: CreateNoteInput): Promise<{ id: number }>;
  findById(id: number, ownerUserId: number): Promise<Note | null>;
  listForTarget(
    ownerUserId: number,
    linkedType: string,
    linkedId: number
  ): Promise<Note[]>;
  update(id: number, ownerUserId: number, input: UpdateNoteInput): Promise<void>;
  delete(id: number, ownerUserId: number): Promise<void>;
  /** Delete every note pointing at this target (any `owner_user_id`). For cleanup when a linked row is removed. */
  deleteAllForLinkedTarget(linkedType: string, linkedId: number): Promise<void>;
  deleteAllForLinkedTargets(linkedType: string, linkedIds: number[]): Promise<void>;
}
