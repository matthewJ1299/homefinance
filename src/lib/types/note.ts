/**
 * User-scoped note attached to an arbitrary domain row via polymorphic (linked_type, linked_id).
 * `linkedType` is an app-defined key (e.g. `NOTE_LINKED_TYPE_SHARED_LIST_ITEM`, `"goal"`); add new keys in application code without schema changes.
 */
export interface Note {
  id: number;
  ownerUserId: number;
  linkedType: string;
  linkedId: number;
  body: string;
  createdAt: string;
  updatedAt: string;
}
