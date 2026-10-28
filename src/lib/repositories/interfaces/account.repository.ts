import type { Account, AccountType } from "@/lib/types";

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  creditLimit?: number | null;
  isShared?: boolean;
}

export interface UpdateAccountInput {
  name?: string;
  creditLimit?: number | null;
  isShared?: boolean;
}

export interface IAccountRepository {
  findById(id: number, ownerUserId: number): Promise<Account | null>;
  /** Own accounts plus household accounts flagged shared. Read-only for the non-owner. */
  findAllVisibleToUser(userId: number): Promise<Account[]>;
  findAllForUser(ownerUserId: number): Promise<Account[]>;
  /** Oldest bank account (primary spending), else oldest account by id. */
  findMainAccountIdForUser(ownerUserId: number): Promise<number | null>;
  create(ownerUserId: number, data: CreateAccountInput): Promise<{ id: number }>;
  update(id: number, ownerUserId: number, data: UpdateAccountInput): Promise<void>;
  delete(id: number, ownerUserId: number): Promise<void>;
}

