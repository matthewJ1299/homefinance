import { all, get, run, lastInsertId } from "@/lib/db";
import { coerceBigInt, coerceBigIntOrNull } from "@/lib/db/coerce-bigint";
import type { Account, AccountType } from "@/lib/types";
import type {
  IAccountRepository,
  CreateAccountInput,
  UpdateAccountInput,
} from "../interfaces/account.repository";

interface AccountRow {
  id: number;
  name: string;
  type: AccountType;
  owner_user_id: number;
  credit_limit: number | null;
  created_at: string;
}

function toAccount(row: AccountRow): Account {
  return {
    id: coerceBigInt(row.id),
    name: row.name,
    type: row.type,
    ownerUserId: coerceBigInt(row.owner_user_id),
    creditLimit: coerceBigIntOrNull(row.credit_limit),
    createdAt: row.created_at,
  };
}

export class AccountRepository implements IAccountRepository {
  async findById(id: number, ownerUserId: number): Promise<Account | null> {
    const row = await get<AccountRow>(
      "SELECT id, name, type, owner_user_id, credit_limit, created_at FROM accounts WHERE id = ? AND owner_user_id = ?",
      [id, ownerUserId]
    );
    return row ? toAccount(row) : null;
  }

  async findAllForUser(ownerUserId: number): Promise<Account[]> {
    const rows = await all<AccountRow>(
      "SELECT id, name, type, owner_user_id, credit_limit, created_at FROM accounts WHERE owner_user_id = ? ORDER BY name",
      [ownerUserId]
    );
    return rows.map(toAccount);
  }

  async findMainAccountIdForUser(ownerUserId: number): Promise<number | null> {
    const bank = await get<{ id: number }>(
      "SELECT id FROM accounts WHERE owner_user_id = ? AND type = 'bank' ORDER BY id ASC LIMIT 1",
      [ownerUserId]
    );
    if (bank?.id != null) return bank.id;
    const any = await get<{ id: number }>(
      "SELECT id FROM accounts WHERE owner_user_id = ? ORDER BY id ASC LIMIT 1",
      [ownerUserId]
    );
    return any?.id ?? null;
  }

  async create(
    ownerUserId: number,
    data: CreateAccountInput
  ): Promise<{ id: number }> {
    await run(
      "INSERT INTO accounts (name, type, owner_user_id, credit_limit) VALUES (?, ?, ?, ?)",
      [data.name, data.type, ownerUserId, data.creditLimit ?? null]
    );
    const id = await lastInsertId();
    return { id };
  }

  async update(
    id: number,
    ownerUserId: number,
    data: UpdateAccountInput
  ): Promise<void> {
    const updates: string[] = [];
    const params: (string | number | boolean | null)[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      params.push(data.name);
    }
    if (data.creditLimit !== undefined) {
      updates.push("credit_limit = ?");
      params.push(data.creditLimit);
    }

    if (updates.length === 0) return;

    params.push(id, ownerUserId);
    await run(
      `UPDATE accounts SET ${updates.join(
        ", "
      )} WHERE id = ? AND owner_user_id = ?`,
      params
    );
  }

  async delete(id: number, ownerUserId: number): Promise<void> {
    await run("DELETE FROM accounts WHERE id = ? AND owner_user_id = ?", [
      id,
      ownerUserId,
    ]);
  }
}

