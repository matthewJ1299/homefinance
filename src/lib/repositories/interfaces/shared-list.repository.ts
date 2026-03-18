export type ListVisibility = "shared" | "personal";

export interface SharedList {
  id: number;
  name: string;
  sortOrder: number;
  createdAt: string;
  visibility: ListVisibility;
  ownerUserId: number | null;
}

export interface CreateSharedListInput {
  name: string;
  sortOrder?: number;
  /**
   * Defaults to `shared` for backward compatibility.
   * Personal lists are only visible to the owning user.
   */
  visibility?: ListVisibility;
}

export interface UpdateSharedListInput {
  name?: string;
  sortOrder?: number;
}

export interface ISharedListRepository {
  /**
   * When `visibility` is omitted, returns all lists the current user can access:
   * - all `shared` lists
   * - the user's own `personal` lists
   */
  findAll(options?: { visibility?: ListVisibility }): Promise<SharedList[]>;
  findById(id: number): Promise<SharedList | null>;
  create(data: CreateSharedListInput): Promise<{ id: number }>;
  update(id: number, data: UpdateSharedListInput): Promise<void>;
  delete(id: number): Promise<void>;
}
