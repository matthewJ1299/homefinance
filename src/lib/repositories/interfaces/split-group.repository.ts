import type { SplitGroup } from "@/lib/types";

export interface ISplitGroupRepository {
  findAll(): Promise<SplitGroup[]>;
  findById(id: number): Promise<SplitGroup | null>;
  findDefault(): Promise<SplitGroup | null>;
  findByName(name: string): Promise<SplitGroup | null>;
  create(data: { name: string; isDefault?: boolean; sortOrder?: number }): Promise<SplitGroup>;
  update(id: number, data: { name?: string; isDefault?: boolean; sortOrder?: number }): Promise<void>;
  delete(id: number): Promise<void>;
  isInUse(id: number): Promise<boolean>;
}
