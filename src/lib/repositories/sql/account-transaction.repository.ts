import { all, get, run, lastInsertId } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import { coerceBigInt, coerceBigIntOrNull } from "@/lib/db/coerce-bigint";
import type {
  IAccountTransactionRepository,
  AccountTransaction,
  AccountTransactionReferenceType,
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
    id: coerceBigInt(row.id),
    accountId: coerceBigInt(row.account_id),
    amount: coerceBigInt(row.amount),
    transactionType: row.transaction_type as AccountTransaction["transactionType"],
    referenceType: row.reference_type as AccountTransaction["referenceType"] | undefined,
    referenceId: row.reference_id != null ? coerceBigInt(row.reference_id) : undefined,
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
    // The typed columns (0049) are what carry the ON DELETE CASCADE, so a ledger
    // row cannot outlive the thing that raised it. reference_type/reference_id
    // stay written alongside for one release; a CHECK keeps the two in step.
    const ref = input.referenceType ?? null;
    const refId = input.referenceId ?? null;
    await run(
      `INSERT INTO account_transactions
         (account_id, amount, transaction_type, reference_type, reference_id, note,
          expense_id, income_id, transfer_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.accountId,
        input.amount,
        input.transactionType,
        ref,
        refId,
        input.note ?? null,
        ref === "expense" ? refId : null,
        ref === "income" ? refId : null,
        ref === "transfer" ? refId : null,
      ]
    );
    const id = await lastInsertId();
    return { id };
  }

  async deleteByReference(
    referenceType: AccountTransactionReferenceType,
    referenceId: number
  ): Promise<void> {
    const hid = requireHouseholdId();
    // Scoped through `accounts`, the same way getBalance is: account_transactions
    // carries no household_id of its own.
    await run(
      `DELETE FROM account_transactions at
        USING accounts a
        WHERE at.account_id = a.id
          AND a.household_id = ?
          AND at.reference_type = ?
          AND at.reference_id = ?`,
      [hid, referenceType, referenceId]
    );
  }

  async updateAmountByReference(
    referenceType: AccountTransactionReferenceType,
    referenceId: number,
    amount: number
  ): Promise<void> {
    const hid = requireHouseholdId();
    await run(
      `UPDATE account_transactions at
          SET amount = ?
         FROM accounts a
        WHERE at.account_id = a.id
          AND a.household_id = ?
          AND at.reference_type = ?
          AND at.reference_id = ?`,
      [amount, hid, referenceType, referenceId]
    );
  }

  async getBalance(accountId: number): Promise<number> {
    const hid = requireHouseholdId();
    const row = await get<{ balance: number | string }>(
      `SELECT COALESCE(SUM(at.amount), 0) AS balance
       FROM account_transactions at
       INNER JOIN accounts a ON at.account_id = a.id
       WHERE at.account_id = ? AND a.household_id = ?`,
      [accountId, hid]
    );
    // SUM() over a BIGINT column is NUMERIC, which node-pg returns as a STRING.
    // Without this the balance was a string wearing a `number` type: Home's
    // cash-on-hand concatenated its accounts instead of adding them, available
    // credit came out as "50000-20000", and `balance !== 0` never matched.
    return coerceBigInt(row?.balance);
  }

  /**
   * Balances for many accounts in one query.
   *
   * AccountService ran `getBalance` in a loop, so listing accounts cost one
   * round trip per account -- on Home, Accounts and the Add sheet. Accounts
   * with no ledger rows are absent from the result; callers default to 0.
   */
  async getBalances(accountIds: number[]): Promise<Map<number, number>> {
    const hid = requireHouseholdId();
    const unique = [...new Set(accountIds.filter((id) => Number.isInteger(id) && id > 0))];
    if (unique.length === 0) return new Map();
    const placeholders = unique.map(() => "?").join(", ");
    const rows = await all<{ account_id: number | string; balance: number | string }>(
      `SELECT at.account_id, COALESCE(SUM(at.amount), 0) AS balance
         FROM account_transactions at
         INNER JOIN accounts a ON at.account_id = a.id
        WHERE a.household_id = ? AND at.account_id IN (${placeholders})
        GROUP BY at.account_id`,
      [hid, ...unique]
    );
    return new Map(rows.map((r) => [coerceBigInt(r.account_id), coerceBigInt(r.balance)]));
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
