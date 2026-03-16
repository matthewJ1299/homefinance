import type { Account, AccountType } from "@/lib/types";

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  creditLimit?: number | null;
}

export interface UpdateAccountInput {
  name?: string;
  creditLimit?: number | null;
}

export interface IAccountRepository {
  findById(id: number, ownerUserId: number): Promise<Account | null>;
  findAllForUser(ownerUserId: number): Promise<Account[]>;
  create(ownerUserId: number, data: CreateAccountInput): Promise<{ id: number }>;
  update(id: number, ownerUserId: number, data: UpdateAccountInput): Promise<void>;
  delete(id: number, ownerUserId: number): Promise<void>;
}

