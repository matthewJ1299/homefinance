import { all, get, run, lastInsertId } from "@/lib/db";
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
    id: row.id,
    fromAccountId: row.from_account_id,
    toAccountId: row.to_account_id,
    amount: row.amount,
    note: row.note,
    createdAt: row.created_at,
  };
}

export class TransferRepository implements ITransferRepository {
  async findById(id: number): Promise<Transfer | null> {
    const row = await get<TransferRow>(
      "SELECT id, from_account_id, to_account_id, amount, note, created_at FROM transfers WHERE id = ?",
      [id]
    );
    return row ? toTransfer(row) : null;
  }

  async create(input: CreateTransferInput): Promise<{ id: number }> {
    await run(
      "INSERT INTO transfers (from_account_id, to_account_id, amount, note) VALUES (?, ?, ?, ?)",
      [input.fromAccountId, input.toAccountId, input.amount, input.note ?? null]
    );
    const id = await lastInsertId();
    return { id };
  }

  async findByAccount(
    accountId: number,
    limit: number,
    offset: number
  ): Promise<Transfer[]> {
    const rows = await all<TransferRow>(
      "SELECT id, from_account_id, to_account_id, amount, note, created_at FROM transfers WHERE from_account_id = ? OR to_account_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [accountId, accountId, limit, offset]
    );
    return rows.map(toTransfer);
  }
}

