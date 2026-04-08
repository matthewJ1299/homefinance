export interface VendorCategoryMappingRow {
  id: number;
  userId: number;
  merchantKeyNormalized: string;
  categoryId: number;
  useCount: number;
  lastUsedAt: string;
}

export interface IVendorCategoryMappingRepository {
  findByUserAndMerchantKey(userId: number, merchantKeyNormalized: string): Promise<VendorCategoryMappingRow | null>;
  upsertIncrement(userId: number, merchantKeyNormalized: string, categoryId: number): Promise<void>;
}
