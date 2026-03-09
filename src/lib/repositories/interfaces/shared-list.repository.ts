export interface SharedList {
  id: number;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export interface CreateSharedListInput {
  name: string;
  sortOrder?: number;
}

export interface UpdateSharedListInput {
  name?: string;
  sortOrder?: number;
}

export interface ISharedListRepository {
  findAll(): Promise<SharedList[]>;
  findById(id: number): Promise<SharedList | null>;
  create(data: CreateSharedListInput): Promise<{ id: number }>;
  update(id: number, data: UpdateSharedListInput): Promise<void>;
  delete(id: number): Promise<void>;
}
