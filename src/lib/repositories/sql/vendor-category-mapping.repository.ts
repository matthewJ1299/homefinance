import { get, run } from "@/lib/db";
import type {
  IVendorCategoryMappingRepository,
  VendorCategoryMappingRow,
} from "../interfaces/vendor-category-mapping.repository";

interface Row {
  id: number;
  user_id: number;
  merchant_key_normalized: string;
  category_id: number;
  use_count: number;
  last_used_at: string;
}

function mapRow(r: Row): VendorCategoryMappingRow {
  return {
    id: r.id,
    userId: r.user_id,
    merchantKeyNormalized: r.merchant_key_normalized,
    categoryId: r.category_id,
    useCount: r.use_count,
    lastUsedAt: r.last_used_at,
  };
}

export class VendorCategoryMappingRepository implements IVendorCategoryMappingRepository {
  async findByUserAndMerchantKey(
    userId: number,
    merchantKeyNormalized: string
  ): Promise<VendorCategoryMappingRow | null> {
    const row = await get<Row>(
      `SELECT id, user_id, merchant_key_normalized, category_id, use_count, last_used_at
       FROM vendor_category_mappings
       WHERE user_id = ? AND merchant_key_normalized = ?`,
      [userId, merchantKeyNormalized]
    );
    return row ? mapRow(row) : null;
  }

  async upsertIncrement(userId: number, merchantKeyNormalized: string, categoryId: number): Promise<void> {
    await run(
      `INSERT INTO vendor_category_mappings (user_id, merchant_key_normalized, category_id, use_count, last_used_at)
       VALUES (?, ?, ?, 1, NOW())
       ON CONFLICT (user_id, merchant_key_normalized) DO UPDATE SET
         category_id = EXCLUDED.category_id,
         use_count = vendor_category_mappings.use_count + 1,
         last_used_at = NOW()`,
      [userId, merchantKeyNormalized, categoryId]
    );
  }
}
