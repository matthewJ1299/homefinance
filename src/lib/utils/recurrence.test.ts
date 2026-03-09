import { describe, it, expect } from "vitest";
import { expandRecurrence } from "./recurrence";

describe("expandRecurrence", () => {
  it("returns single date for none when event date is in range", () => {
    const result = expandRecurrence("2025-03-15", "none", null, "2025-03-01", "2025-03-31");
    expect(result).toEqual(["2025-03-15"]);
  });

  it("returns empty for none when event date is before range", () => {
    const result = expandRecurrence("2025-02-10", "none", null, "2025-03-01", "2025-03-31");
    expect(result).toEqual([]);
  });

  it("returns empty for none when event date is after range", () => {
    const result = expandRecurrence("2025-04-10", "none", null, "2025-03-01", "2025-03-31");
    expect(result).toEqual([]);
  });

  it("expands weekly within range", () => {
    const result = expandRecurrence("2025-03-03", "weekly", null, "2025-03-01", "2025-03-31");
    expect(result).toContain("2025-03-03");
    expect(result).toContain("2025-03-10");
    expect(result).toContain("2025-03-17");
    expect(result).toContain("2025-03-24");
    expect(result).toContain("2025-03-31");
    expect(result.length).toBe(5);
  });

  it("expands monthly using event day when recurrence_day_of_month is null", () => {
    const result = expandRecurrence("2025-01-15", "monthly", null, "2025-01-01", "2025-03-31");
    expect(result).toEqual(["2025-01-15", "2025-02-15", "2025-03-15"]);
  });

  it("expands monthly using recurrence_day_of_month and clamps to last day", () => {
    const result = expandRecurrence("2025-01-01", "monthly", 31, "2025-01-01", "2025-03-31");
    expect(result).toEqual(["2025-01-31", "2025-02-28", "2025-03-31"]);
  });

  it("expands yearly within range", () => {
    const result = expandRecurrence("2020-06-15", "yearly", null, "2025-01-01", "2027-12-31");
    expect(result).toEqual(["2025-06-15", "2026-06-15", "2027-06-15"]);
  });

  it("returns empty for yearly when no year falls in range", () => {
    const result = expandRecurrence("2030-06-15", "yearly", null, "2025-01-01", "2027-12-31");
    expect(result).toEqual([]);
  });
});
