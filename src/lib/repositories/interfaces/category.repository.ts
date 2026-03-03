import type { Category, CategoryWithActive } from "@/lib/types";

export interface ICategoryRepository {
  findAll(): Promise<Category[]>;
  findAllIncludingInactive(): Promise<CategoryWithActive[]>;
  findById(id: number): Promise<Category | null>;
  create(data: {
    name: string;
    groupName: string;
    icon?: string;
    sortOrder?: number;
    costType?: "fixed" | "variable";
    defaultAmount?: number | null;
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
    }
  ): Promise<void>;
  delete(id: number): Promise<void>;
  isInUse(id: number): Promise<boolean>;
}
