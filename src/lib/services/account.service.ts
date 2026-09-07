import type { AccountWithBalance, AccountType } from "@/lib/types";
import {
  getAccountRepository,
  getAccountTransactionRepository,
  getUserRepository,
} from "@/lib/repositories";

interface CreateAccountOptions {
  name: string;
  type: AccountType;
  creditLimit?: number | null;
  isShared?: boolean;
}

interface UpdateAccountOptions {
  name?: string;
  creditLimit?: number | null;
  isShared?: boolean;
}

export class AccountService {
  constructor(
    private readonly accountRepo = getAccountRepository(),
    private readonly txRepo = getAccountTransactionRepository(),
    private readonly userRepo = getUserRepository()
  ) {}

  async getMainAccountId(userId: number): Promise<number | null> {
    await this.ensurePrimaryAccountCoherence(userId);
    const primary = await this.userRepo.getPrimaryAccountId(userId);
    if (primary != null) {
      const acc = await this.accountRepo.findById(primary, userId);
      if (acc) return primary;
    }
    return this.accountRepo.findMainAccountIdForUser(userId);
  }

  /**
   * Accounts a spend can be filed against: your own, plus the household's shared
   * ones. Ownership still decides who can rename, share, or delete -- this is a
   * read for the surfaces that need to name an account.
   */
  async listAccountsVisibleToUser(
    userId: number
  ): Promise<{ accounts: AccountWithBalance[]; primaryAccountId: number | null }> {
    await this.ensurePrimaryAccountCoherence(userId);
    const primaryAccountId = await this.userRepo.getPrimaryAccountId(userId);
    const accounts = await this.accountRepo.findAllVisibleToUser(userId);
    const results: AccountWithBalance[] = [];
    for (const acc of accounts) {
      const balance = await this.txRepo.getBalance(acc.id);
      const availableCredit =
        acc.type === "credit" && acc.creditLimit != null ? acc.creditLimit + balance : undefined;
      results.push({ ...acc, balance, availableCredit });
    }
    return { accounts: results, primaryAccountId };
  }

  /** Owner-scoped. Backs Settings, where renaming, sharing and deleting live. */
  async listAccountsForUser(
    userId: number
  ): Promise<{ accounts: AccountWithBalance[]; primaryAccountId: number | null }> {
    await this.ensurePrimaryAccountCoherence(userId);
    const primaryAccountId = await this.userRepo.getPrimaryAccountId(userId);
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
    const pid = primaryAccountId;
    const byName = (a: AccountWithBalance, b: AccountWithBalance) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    const sorted =
      pid == null
        ? [...results].sort(byName)
        : [...results].sort((a, b) => {
            if (a.id === pid && b.id !== pid) return -1;
            if (b.id === pid && a.id !== pid) return 1;
            return byName(a, b);
          });
    return { accounts: sorted, primaryAccountId };
  }

  async setPrimaryAccount(userId: number, accountId: number): Promise<void> {
    const acc = await this.accountRepo.findById(accountId, userId);
    if (!acc) {
      throw new Error("Account not found");
    }
    await this.userRepo.setPrimaryAccountId(userId, accountId);
  }

  async createAccount(
    userId: number,
    data: CreateAccountOptions
  ): Promise<AccountWithBalance> {
    const { id } = await this.accountRepo.create(userId, {
      name: data.name,
      type: data.type,
      creditLimit: data.creditLimit ?? null,
      isShared: data.isShared ?? false,
    });
    const account = await this.accountRepo.findById(id, userId);
    if (!account) {
      throw new Error("Failed to load account after create");
    }
    await this.ensurePrimaryAccountCoherence(userId);
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
    // `update` ignores `undefined` per field, so a rename still leaves sharing
    // alone -- but dropping the flag entirely meant no account could ever be
    // shared, whatever the switch in Settings said.
    await this.accountRepo.update(accountId, userId, {
      name: data.name,
      creditLimit: data.creditLimit,
      isShared: data.isShared,
    });
  }

  async deleteAccount(userId: number, accountId: number): Promise<void> {
    const balance = await this.txRepo.getBalance(accountId);
    if (balance !== 0) {
      throw new Error("Cannot delete account with non-zero balance");
    }
    await this.accountRepo.delete(accountId, userId);
    await this.ensurePrimaryAccountCoherence(userId);
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

  private async ensurePrimaryAccountCoherence(userId: number): Promise<void> {
    const accounts = await this.accountRepo.findAllForUser(userId);
    const ids = new Set(accounts.map((a) => a.id));
    const primary = await this.userRepo.getPrimaryAccountId(userId);

    if (accounts.length === 0) {
      if (primary != null) {
        await this.userRepo.setPrimaryAccountId(userId, null);
      }
      return;
    }
    if (accounts.length === 1) {
      const only = accounts[0]!.id;
      if (primary !== only) {
        await this.userRepo.setPrimaryAccountId(userId, only);
      }
      return;
    }
    if (primary != null && ids.has(primary)) {
      return;
    }
    const fallback = await this.accountRepo.findMainAccountIdForUser(userId);
    await this.userRepo.setPrimaryAccountId(userId, fallback);
  }
}
