import type { Category, CategoryWithActive } from "@/lib/types";
import type { CategorySemanticKey } from "@/lib/categories/semantic-key";

export interface ICategoryRepository {
  findAll(): Promise<Category[]>;
  findAllIncludingInactive(): Promise<CategoryWithActive[]>;
  findById(id: number): Promise<Category | null>;
  /** User-facing lookup only. Anything that changes behaviour uses findBySemanticKey. */
  findByName(name: string): Promise<Category | null>;
  /** The behavioural lookup: stable across renames. */
  findBySemanticKey(key: CategorySemanticKey): Promise<Category | null>;
  create(data: {
    name: string;
    groupName: string;
    icon?: string;
    sortOrder?: number;
    costType?: "fixed" | "variable";
    defaultAmount?: number | null;
    semanticKey?: CategorySemanticKey | null;
  }): Promise<Category>;
  update(
    id: number,
    data: {
      name?: string;
      groupName?: string;
      isActive?: boolean;
      sortOrder?: number;
      costType?: "fixed" | "variable";
      defaultAmount?: number | null;
      rollover?: boolean;
      targetMinor?: number | null;
      targetDate?: string | null;
    }
  ): Promise<void>;
  delete(id: number): Promise<void>;
  isInUse(id: number): Promise<boolean>;
}
