import type { AccountWithBalance, AccountType } from "@/lib/types";
import {
  getAccountRepository,
  getAccountTransactionRepository,
} from "@/lib/repositories";

interface CreateAccountOptions {
  name: string;
  type: AccountType;
  creditLimit?: number | null;
}

interface UpdateAccountOptions {
  name?: string;
  creditLimit?: number | null;
}

export class AccountService {
  constructor(
    private readonly accountRepo = getAccountRepository(),
    private readonly txRepo = getAccountTransactionRepository()
  ) {}

  async listAccountsForUser(userId: number): Promise<AccountWithBalance[]> {
    const accounts = await this.accountRepo.findAllForUser(userId);
    const results: AccountWithBalance[] = [];
    for (const acc of accounts) {
      const balance = await this.txRepo.getBalance(acc.id);
      const availableCredit =
        acc.type === "credit" && acc.creditLimit != null
          ? acc.creditLimit + balance
          : undefined;
      results.push({ ...acc, balance, availableCredit });
    }
    return results;
  }

  async createAccount(
    userId: number,
    data: CreateAccountOptions
  ): Promise<AccountWithBalance> {
    const { id } = await this.accountRepo.create(userId, {
      name: data.name,
      type: data.type,
      creditLimit: data.creditLimit ?? null,
    });
    const account = await this.accountRepo.findById(id, userId);
    if (!account) {
      throw new Error("Failed to load account after create");
    }
    const balance = await this.txRepo.getBalance(account.id);
    const availableCredit =
      account.type === "credit" && account.creditLimit != null
        ? account.creditLimit + balance
        : undefined;
    return { ...account, balance, availableCredit };
  }

  async updateAccount(
    userId: number,
    accountId: number,
    data: UpdateAccountOptions
  ): Promise<void> {
    await this.accountRepo.update(accountId, userId, {
      name: data.name,
      creditLimit: data.creditLimit,
    });
  }

  async deleteAccount(userId: number, accountId: number): Promise<void> {
    const balance = await this.txRepo.getBalance(accountId);
    if (balance !== 0) {
      throw new Error("Cannot delete account with non-zero balance");
    }
    await this.accountRepo.delete(accountId, userId);
  }

  async getAccountWithBalance(
    userId: number,
    accountId: number
  ): Promise<AccountWithBalance | null> {
    const account = await this.accountRepo.findById(accountId, userId);
    if (!account) return null;
    const balance = await this.txRepo.getBalance(account.id);
    const availableCredit =
      account.type === "credit" && account.creditLimit != null
        ? account.creditLimit + balance
        : undefined;
    return { ...account, balance, availableCredit };
  }
}

