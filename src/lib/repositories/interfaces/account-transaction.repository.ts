export type AccountTransactionType =
  | "income"
  | "expense"
  | "transfer_in"
  | "transfer_out"
  | "credit_payment"
  | "adjustment";

export type AccountTransactionReferenceType = "expense" | "income" | "transfer";

export interface CreateAccountTransactionInput {
  accountId: number;
  amount: number;
  transactionType: AccountTransactionType;
  referenceType?: AccountTransactionReferenceType;
  referenceId?: number;
  note?: string | null;
}

export interface AccountTransaction {
  id: number;
  accountId: number;
  amount: number;
  transactionType: AccountTransactionType;
  referenceType?: AccountTransactionReferenceType;
  referenceId?: number;
  note: string | null;
  createdAt: string;
}

export interface IAccountTransactionRepository {
  create(input: CreateAccountTransactionInput): Promise<{ id: number }>;
  /**
   * Removes the ledger rows raised for one source record.
   *
   * `reference_type`/`reference_id` is a polymorphic pointer with no foreign
   * key, so the database cannot cascade this. Without it, deleting a spend left
   * its debit behind and the account balance -- which this ledger IS -- stayed
   * permanently wrong.
   */
  deleteByReference(
    referenceType: AccountTransactionReferenceType,
    referenceId: number
  ): Promise<void>;
  /**
   * Re-points the amount on the ledger row(s) raised for one source record.
   *
   * Editing a spend or an income changed the row the user sees but left the
   * ledger on the old figure, so the account balance silently drifted by the
   * difference every time someone corrected a typo.
   */
  updateAmountByReference(
    referenceType: AccountTransactionReferenceType,
    referenceId: number,
    amount: number
  ): Promise<void>;
  getBalance(accountId: number): Promise<number>;
  /** Balances for many accounts in one query, keyed by account id. */
  getBalances(accountIds: number[]): Promise<Map<number, number>>;
  findById(id: number): Promise<AccountTransaction | null>;
  findByIds(ids: number[]): Promise<AccountTransaction[]>;
  findByAccount(
    accountId: number,
    limit: number,
    offset: number
  ): Promise<AccountTransaction[]>;
}

