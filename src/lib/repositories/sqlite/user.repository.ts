import { eq, ne } from "drizzle-orm";
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

  async findAllExcept(userId: number): Promise<UserSummary[]> {
    const rows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(ne(users.id, userId))
      .orderBy(users.id);
    return rows as UserSummary[];
  }

  async findById(id: number): Promise<UserSummary | null> {
    const [row] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return (row as UserSummary) ?? null;
  }
}
