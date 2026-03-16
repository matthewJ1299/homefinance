import { all, get, run, lastInsertId } from "@/lib/db";
import type {
  IAccountTransactionRepository,
  AccountTransaction,
  CreateAccountTransactionInput,
} from "../interfaces/account-transaction.repository";

interface AccountTransactionRow {
  id: number;
  account_id: number;
  amount: number;
  transaction_type: string;
  reference_type: string | null;
  reference_id: number | null;
  note: string | null;
  created_at: string;
}

function toAccountTransaction(row: AccountTransactionRow): AccountTransaction {
  return {
    id: row.id,
    accountId: row.account_id,
    amount: row.amount,
    transactionType: row.transaction_type as AccountTransaction["transactionType"],
    referenceType: row.reference_type as AccountTransaction["referenceType"] | undefined,
    referenceId: row.reference_id ?? undefined,
    note: row.note,
    createdAt: row.created_at,
  };
}

export class AccountTransactionRepository
  implements IAccountTransactionRepository
{
  async create(
    input: CreateAccountTransactionInput
  ): Promise<{ id: number }> {
    await run(
      "INSERT INTO account_transactions (account_id, amount, transaction_type, reference_type, reference_id, note) VALUES (?, ?, ?, ?, ?, ?)",
      [
        input.accountId,
        input.amount,
        input.transactionType,
        input.referenceType ?? null,
        input.referenceId ?? null,
        input.note ?? null,
      ]
    );
    const id = await lastInsertId();
    return { id };
  }

  async getBalance(accountId: number): Promise<number> {
    const row = await get<{ balance: number }>(
      "SELECT COALESCE(SUM(amount), 0) AS balance FROM account_transactions WHERE account_id = ?",
      [accountId]
    );
    return row?.balance ?? 0;
  }

  async findByAccount(
    accountId: number,
    limit: number,
    offset: number
  ): Promise<AccountTransaction[]> {
    const rows = await all<AccountTransactionRow>(
      "SELECT id, account_id, amount, transaction_type, reference_type, reference_id, note, created_at FROM account_transactions WHERE account_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [accountId, limit, offset]
    );
    return rows.map(toAccountTransaction);
  }
}

