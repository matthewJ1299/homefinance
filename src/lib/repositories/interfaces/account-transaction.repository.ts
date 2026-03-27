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
  getBalance(accountId: number): Promise<number>;
  findById(id: number): Promise<AccountTransaction | null>;
  findByIds(ids: number[]): Promise<AccountTransaction[]>;
  findByAccount(
    accountId: number,
    limit: number,
    offset: number
  ): Promise<AccountTransaction[]>;
}

