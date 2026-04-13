import { all, get, run, lastInsertId } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
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
    const hid = requireHouseholdId();
    const accountOk = await get<{ id: number }>(
      "SELECT id FROM accounts WHERE id = ? AND household_id = ? LIMIT 1",
      [input.accountId, hid]
    );
    if (!accountOk) {
      throw new Error("Account not found for this household");
    }
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
    const hid = requireHouseholdId();
    const row = await get<{ balance: number }>(
      `SELECT COALESCE(SUM(at.amount), 0) AS balance
       FROM account_transactions at
       INNER JOIN accounts a ON at.account_id = a.id
       WHERE at.account_id = ? AND a.household_id = ?`,
      [accountId, hid]
    );
    return row?.balance ?? 0;
  }

  async findById(id: number): Promise<AccountTransaction | null> {
    const hid = requireHouseholdId();
    const row = await get<AccountTransactionRow>(
      `SELECT at.id, at.account_id, at.amount, at.transaction_type, at.reference_type, at.reference_id, at.note, at.created_at
       FROM account_transactions at
       INNER JOIN accounts a ON at.account_id = a.id
       WHERE at.id = ? AND a.household_id = ?`,
      [id, hid]
    );
    return row ? toAccountTransaction(row) : null;
  }

  async findByIds(ids: number[]): Promise<AccountTransaction[]> {
    if (ids.length === 0) return [];
    const hid = requireHouseholdId();
    const placeholders = ids.map(() => "?").join(", ");
    const rows = await all<AccountTransactionRow>(
      `SELECT at.id, at.account_id, at.amount, at.transaction_type, at.reference_type, at.reference_id, at.note, at.created_at
       FROM account_transactions at
       INNER JOIN accounts a ON at.account_id = a.id
       WHERE a.household_id = ? AND at.id IN (${placeholders})`,
      [hid, ...ids]
    );
    return rows.map(toAccountTransaction);
  }

  async findByAccount(
    accountId: number,
    limit: number,
    offset: number
  ): Promise<AccountTransaction[]> {
    const hid = requireHouseholdId();
    const rows = await all<AccountTransactionRow>(
      `SELECT at.id, at.account_id, at.amount, at.transaction_type, at.reference_type, at.reference_id, at.note, at.created_at
       FROM account_transactions at
       INNER JOIN accounts a ON at.account_id = a.id
       WHERE at.account_id = ? AND a.household_id = ?
       ORDER BY at.created_at DESC LIMIT ? OFFSET ?`,
      [accountId, hid, limit, offset]
    );
    return rows.map(toAccountTransaction);
  }
}
