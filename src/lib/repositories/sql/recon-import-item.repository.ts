import { all, get, lastInsertId, run } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import type {
  CreateReconImportItemInput,
  IReconImportItemRepository,
  ReconImportItemRow,
  ReconImportItemStatus,
} from "../interfaces/recon-import-item.repository";

interface Row {
  id: number;
  user_id: number;
  graph_message_id: string;
  status: string;
  parse_type: string;
  amount: number;
  txn_date: string;
  vendor: string;
  merchant_key_normalized: string;
  matched_expense_ids: unknown;
  suggested_category_id: number | null;
  raw_subject: string | null;
  raw_body_preview: string | null;
  created_at: string;
  updated_at: string;
}

function parseMatchedIds(raw: unknown): number[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    return raw.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((x) => Number(x)).filter((n) => Number.isFinite(n));
      }
    } catch {
      return null;
    }
  }
  return null;
}

function mapRow(r: Row): ReconImportItemRow {
  return {
    id: r.id,
    userId: r.user_id,
    graphMessageId: r.graph_message_id,
    status: r.status as ReconImportItemStatus,
    parseType: r.parse_type,
    amount: r.amount,
    txnDate: typeof r.txn_date === "string" ? r.txn_date.slice(0, 10) : String(r.txn_date),
    vendor: r.vendor,
    merchantKeyNormalized: r.merchant_key_normalized,
    matchedExpenseIds: parseMatchedIds(r.matched_expense_ids),
    suggestedCategoryId: r.suggested_category_id,
    rawSubject: r.raw_subject,
    rawBodyPreview: r.raw_body_preview,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export class ReconImportItemRepository implements IReconImportItemRepository {
  async upsertByMessageId(input: CreateReconImportItemInput): Promise<{ id: number }> {
    const hid = requireHouseholdId();
    const matchedJson =
      input.matchedExpenseIds != null && input.matchedExpenseIds.length > 0
        ? JSON.stringify(input.matchedExpenseIds)
        : null;
    await run(
      `INSERT INTO recon_import_items (
        user_id, household_id, graph_message_id, status, parse_type, amount, txn_date, vendor,
        merchant_key_normalized, matched_expense_ids, suggested_category_id,
        raw_subject, raw_body_preview, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON CONFLICT (user_id, graph_message_id) DO UPDATE SET
        status = CASE
          WHEN recon_import_items.status IN ('ignored','accepted_duplicate','accepted_add') THEN recon_import_items.status
          ELSE EXCLUDED.status
        END,
        parse_type = EXCLUDED.parse_type,
        amount = EXCLUDED.amount,
        txn_date = EXCLUDED.txn_date,
        vendor = EXCLUDED.vendor,
        merchant_key_normalized = EXCLUDED.merchant_key_normalized,
        matched_expense_ids = EXCLUDED.matched_expense_ids,
        suggested_category_id = EXCLUDED.suggested_category_id,
        raw_subject = EXCLUDED.raw_subject,
        raw_body_preview = EXCLUDED.raw_body_preview,
        household_id = EXCLUDED.household_id,
        updated_at = NOW()`,
      [
        input.userId,
        hid,
        input.graphMessageId,
        input.status,
        input.parseType,
        input.amount,
        input.txnDate,
        input.vendor,
        input.merchantKeyNormalized,
        matchedJson,
        input.suggestedCategoryId,
        input.rawSubject,
        input.rawBodyPreview,
      ]
    );
    const row = await get<{ id: number }>(
      `SELECT id FROM recon_import_items WHERE user_id = ? AND graph_message_id = ? AND household_id = ?`,
      [input.userId, input.graphMessageId, hid]
    );
    if (row?.id != null) return { id: row.id };
    return { id: await lastInsertId() };
  }

  async findByIdForUser(id: number, userId: number): Promise<ReconImportItemRow | null> {
    const hid = requireHouseholdId();
    const row = await get<Row>(
      `SELECT id, user_id, graph_message_id, status, parse_type, amount, txn_date::text AS txn_date,
              vendor, merchant_key_normalized, matched_expense_ids, suggested_category_id,
              raw_subject, raw_body_preview, created_at, updated_at
       FROM recon_import_items WHERE id = ? AND user_id = ? AND household_id = ?`,
      [id, userId, hid]
    );
    return row ? mapRow(row as Row) : null;
  }

  async deleteByUserId(userId: number): Promise<void> {
    const hid = requireHouseholdId();
    await run("DELETE FROM recon_import_items WHERE user_id = ? AND household_id = ?", [userId, hid]);
  }

  async findPendingByUserId(userId: number): Promise<ReconImportItemRow[]> {
    const hid = requireHouseholdId();
    const rows = await all<Row>(
      `SELECT id, user_id, graph_message_id, status, parse_type, amount, txn_date::text AS txn_date,
              vendor, merchant_key_normalized, matched_expense_ids, suggested_category_id,
              raw_subject, raw_body_preview, created_at, updated_at
       FROM recon_import_items
       WHERE user_id = ? AND household_id = ? AND status IN ('pending_duplicate','pending_add')
       ORDER BY txn_date DESC, id DESC`,
      [userId, hid]
    );
    return rows.map((r) => mapRow(r as Row));
  }

  async updateStatusById(id: number, userId: number, status: ReconImportItemStatus): Promise<void> {
    const hid = requireHouseholdId();
    await run(
      `UPDATE recon_import_items SET status = ?, updated_at = NOW() WHERE id = ? AND user_id = ? AND household_id = ?`,
      [status, id, userId, hid]
    );
  }
}
