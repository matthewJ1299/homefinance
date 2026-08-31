import { all, get, run, lastInsertId } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
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
    const hid = requireHouseholdId();
    const row = await get<AccountRow>(
      "SELECT id, name, type, owner_user_id, credit_limit, created_at FROM accounts WHERE id = ? AND owner_user_id = ? AND household_id = ?",
      [id, ownerUserId, hid]
    );
    return row ? toAccount(row) : null;
  }

  async findAllForUser(ownerUserId: number): Promise<Account[]> {
    const hid = requireHouseholdId();
    const rows = await all<AccountRow>(
      "SELECT id, name, type, owner_user_id, credit_limit, created_at FROM accounts WHERE owner_user_id = ? AND household_id = ? ORDER BY name",
      [ownerUserId, hid]
    );
    return rows.map(toAccount);
  }

  async findMainAccountIdForUser(ownerUserId: number): Promise<number | null> {
    const hid = requireHouseholdId();
    const bank = await get<{ id: number }>(
      "SELECT id FROM accounts WHERE owner_user_id = ? AND household_id = ? AND type = 'bank' ORDER BY id ASC LIMIT 1",
      [ownerUserId, hid]
    );
    if (bank?.id != null) return bank.id;
    const any = await get<{ id: number }>(
      "SELECT id FROM accounts WHERE owner_user_id = ? AND household_id = ? ORDER BY id ASC LIMIT 1",
      [ownerUserId, hid]
    );
    return any?.id ?? null;
  }

  async create(
    ownerUserId: number,
    data: CreateAccountInput
  ): Promise<{ id: number }> {
    const hid = requireHouseholdId();
    await run(
      "INSERT INTO accounts (name, type, owner_user_id, credit_limit, household_id) VALUES (?, ?, ?, ?, ?)",
      [data.name, data.type, ownerUserId, data.creditLimit ?? null, hid]
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

    const hid = requireHouseholdId();
    params.push(id, ownerUserId, hid);
    await run(
      `UPDATE accounts SET ${updates.join(
        ", "
      )} WHERE id = ? AND owner_user_id = ? AND household_id = ?`,
      params
    );
  }

  async delete(id: number, ownerUserId: number): Promise<void> {
    const hid = requireHouseholdId();
    await run("DELETE FROM accounts WHERE id = ? AND owner_user_id = ? AND household_id = ?", [
      id,
      ownerUserId,
      hid,
    ]);
  }
}
