import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { UserSummary } from "../interfaces/user.repository";
import type { IUserRepository } from "../interfaces/user.repository";

export class UserRepository implements IUserRepository {
  async findAll(): Promise<UserSummary[]> {
    const rows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .orderBy(users.id);
    return rows as UserSummary[];
  }
}
