import { describe, it, expect } from "vitest";
import { buildGoalRows, goalsBehind, monthsBetween } from "@/lib/services/finance/goal-categories";

const base = {
  categoryId: 1,
  categoryName: "Car service",
  available: 320_000,
  assigned: 40_000,
  targetMinor: 800_000,
  targetDate: "2026-12-15",
};

describe("goals as dated categories", () => {
  it("counts whole months to the target", () => {
    expect(monthsBetween("2026-09", "2026-12-15")).toBe(3);
    expect(monthsBetween("2026-09", "2026-09-30")).toBe(0);
    expect(monthsBetween("2026-12", "2026-09-01")).toBe(0);
  });

  it("ignores a category with no target — it is just a category", () => {
    expect(buildGoalRows([{ ...base, targetMinor: null }], "2026-09")).toEqual([]);
  });

  it("spreads what is left over the months left, this one included", () => {
    const [row] = buildGoalRows([base], "2026-09");
    // 800000 - 320000 = 480000 over 4 months (Sep, Oct, Nov, Dec)
    expect(row.monthsLeft).toBe(4);
    expect(row.monthlyNeeded).toBe(120_000);
  });

  it("is behind when this month's assignment does not cover the monthly need", () => {
    const [row] = buildGoalRows([base], "2026-09");
    expect(row.onTrack).toBe(false);
    expect(row.shortfall).toBe(80_000);
  });

  it("is on track once the assignment covers it", () => {
    const [row] = buildGoalRows([{ ...base, assigned: 120_000 }], "2026-09");
    expect(row.onTrack).toBe(true);
    expect(row.shortfall).toBe(0);
  });

  it("a reached target needs nothing more, whatever is assigned", () => {
    const [row] = buildGoalRows([{ ...base, available: 900_000, assigned: 0 }], "2026-09");
    expect(row.monthlyNeeded).toBe(0);
    expect(row.onTrack).toBe(true);
    expect(row.progress).toBe(1);
  });

  it("without a date, the whole remainder is what is needed", () => {
    const [row] = buildGoalRows([{ ...base, targetDate: null }], "2026-09");
    expect(row.monthsLeft).toBeNull();
    expect(row.monthlyNeeded).toBe(480_000);
  });

  it("orders the behind list by how far behind it is", () => {
    const rows = buildGoalRows(
      [
        base,
        { ...base, categoryId: 2, categoryName: "Holiday", available: 0, assigned: 0, targetMinor: 1_000_000 },
      ],
      "2026-09"
    );
    expect(goalsBehind(rows).map((g) => g.name)).toEqual(["Holiday", "Car service"]);
  });
});
