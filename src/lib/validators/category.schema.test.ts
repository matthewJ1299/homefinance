import { describe, it, expect } from "vitest";
import { updateCategorySchema } from "./category.schema";

/**
 * Zod strips keys the schema does not name, and `updateCategory` treats an
 * empty result as "nothing to do" and answers success. So a field the action
 * and the repository both accept, but this schema forgets, is not a validation
 * error -- it is a save that reports success and writes nothing. That is
 * exactly how setting a goal target came to toast "saving towards R10 000,00"
 * and change nothing at all.
 */
describe("updateCategorySchema", () => {
  it("keeps every field the repository update accepts", () => {
    const parsed = updateCategorySchema.parse({
      name: "Savings",
      groupName: "Saving up",
      isActive: true,
      sortOrder: 3,
      costType: "variable",
      defaultAmount: 25000,
      rollover: true,
      targetMinor: 1_000_000,
      targetDate: "2027-06-30",
    });

    expect(Object.keys(parsed).sort()).toEqual(
      [
        "costType",
        "defaultAmount",
        "groupName",
        "isActive",
        "name",
        "rollover",
        "sortOrder",
        "targetDate",
        "targetMinor",
      ].sort()
    );
  });

  it("keeps a goal target on its own rather than parsing to an empty update", () => {
    const parsed = updateCategorySchema.parse({
      targetMinor: 1_000_000,
      targetDate: "2027-06-30",
    });
    expect(parsed).toEqual({ targetMinor: 1_000_000, targetDate: "2027-06-30" });
  });

  it("clears a target with nulls", () => {
    expect(updateCategorySchema.parse({ targetMinor: null, targetDate: null })).toEqual({
      targetMinor: null,
      targetDate: null,
    });
  });

  it("rejects a target date that is not a date", () => {
    expect(updateCategorySchema.safeParse({ targetDate: "30 June" }).success).toBe(false);
  });
});
