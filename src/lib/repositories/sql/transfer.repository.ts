import { all, get, run, lastInsertId } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import { coerceBigInt } from "@/lib/db/coerce-bigint";
import type {
  ITransferRepository,
  CreateTransferInput,
  Transfer,
} from "../interfaces/transfer.repository";

interface TransferRow {
  id: number;
  from_account_id: number;
  to_account_id: number;
  amount: number;
  note: string | null;
  created_at: string;
}

function toTransfer(row: TransferRow): Transfer {
  return {
    id: coerceBigInt(row.id),
    fromAccountId: coerceBigInt(row.from_account_id),
    toAccountId: coerceBigInt(row.to_account_id),
    amount: coerceBigInt(row.amount),
    note: row.note,
    createdAt: row.created_at,
  };
}

export class TransferRepository implements ITransferRepository {
  async findById(id: number): Promise<Transfer | null> {
    const hid = requireHouseholdId();
    const row = await get<TransferRow>(
      "SELECT id, from_account_id, to_account_id, amount, note, created_at FROM transfers WHERE id = ? AND household_id = ?",
      [id, hid]
    );
    return row ? toTransfer(row) : null;
  }

  async create(input: CreateTransferInput): Promise<{ id: number }> {
    const hid = requireHouseholdId();
    await run(
      "INSERT INTO transfers (from_account_id, to_account_id, amount, note, household_id) VALUES (?, ?, ?, ?, ?)",
      [input.fromAccountId, input.toAccountId, input.amount, input.note ?? null, hid]
    );
    const id = await lastInsertId();
    return { id };
  }

  async findByAccount(
    accountId: number,
    limit: number,
    offset: number
  ): Promise<Transfer[]> {
    const hid = requireHouseholdId();
    const rows = await all<TransferRow>(
      "SELECT id, from_account_id, to_account_id, amount, note, created_at FROM transfers WHERE household_id = ? AND (from_account_id = ? OR to_account_id = ?) ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [hid, accountId, accountId, limit, offset]
    );
    return rows.map(toTransfer);
  }
}
