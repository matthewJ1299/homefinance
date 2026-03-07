import { all, get } from "@/lib/db";
import type { UserSummary, UserForAuth } from "../interfaces/user.repository";
import type { IUserRepository } from "../interfaces/user.repository";

interface UserRow {
  id: number;
  name: string;
  email?: string;
  password_hash?: string;
}

function toSummary(r: UserRow): UserSummary {
  return { id: r.id, name: r.name };
}

function toUserForAuth(r: UserRow & { email: string; password_hash: string }): UserForAuth {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    passwordHash: r.password_hash,
  };
}

export class UserRepository implements IUserRepository {
  async findAll(): Promise<UserSummary[]> {
    const rows = await all<UserRow>("SELECT id, name FROM users ORDER BY id");
    return rows.map(toSummary);
  }

  async findAllExcept(userId: number): Promise<UserSummary[]> {
    const rows = await all<UserRow>("SELECT id, name FROM users WHERE id != ? ORDER BY id", [userId]);
    return rows.map(toSummary);
  }

  async findById(id: number): Promise<UserSummary | null> {
    const row = await get<UserRow>("SELECT id, name FROM users WHERE id = ?", [id]);
    return row ? toSummary(row) : null;
  }

  async findByEmailForAuth(email: string): Promise<UserForAuth | null> {
    const row = await get<UserRow & { email: string; password_hash: string }>(
      "SELECT id, name, email, password_hash FROM users WHERE email = ?",
      [email]
    );
    return row ? toUserForAuth(row) : null;
  }
}
