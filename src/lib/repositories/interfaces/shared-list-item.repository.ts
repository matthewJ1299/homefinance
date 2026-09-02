export interface SharedListItem {
  id: number;
  listId: number;
  label: string;
  quantity: number;
  completed: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface CreateSharedListItemInput {
  listId: number;
  label: string;
  quantity?: number;
  sortOrder?: number;
}

export interface UpdateSharedListItemInput {
  label?: string;
  quantity?: number;
  completed?: boolean;
  sortOrder?: number;
}

export interface ISharedListItemRepository {
  findByListId(listId: number): Promise<SharedListItem[]>;
  /** Open (incomplete) item counts per list id — one query for dashboard/settings aggregates. */
  countOpenItemsByListIds(listIds: number[]): Promise<Map<number, number>>;
  findById(id: number): Promise<SharedListItem | null>;
  create(data: CreateSharedListItemInput): Promise<{ id: number }>;
  update(id: number, data: UpdateSharedListItemInput): Promise<void>;
  delete(id: number): Promise<void>;
  deleteCompletedByListId(listId: number): Promise<void>;
}
