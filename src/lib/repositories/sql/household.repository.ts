import { lastInsertId, run } from "@/lib/db";
import type { IHouseholdRepository } from "../interfaces/household.repository";

export class HouseholdRepository implements IHouseholdRepository {
  async createHousehold(name: string): Promise<number> {
    await run("INSERT INTO households (name) VALUES (?)", [name]);
    const id = await lastInsertId();
    if (id == null) {
      throw new Error("Household insert did not return an id");
    }
    return id;
  }
}
