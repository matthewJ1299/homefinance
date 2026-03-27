import { describe, it, expect } from "vitest";
import {
  prevMonth,
  nextMonth,
  monthFromDate,
  isValidMonth,
  formatMonth,
  normalizeBudgetMonthStartDay,
  getBudgetPeriodForMonthKey,
  budgetMonthKeyFromIsoDate,
  formatBudgetMonthLabel,
} from "./date";

describe("date utils", () => {
  describe("prevMonth", () => {
    it("returns previous month in YYYY-MM format", () => {
      expect(prevMonth("2024-03")).toBe("2024-02");
      expect(prevMonth("2024-01")).toBe("2023-12");
      expect(prevMonth("2025-12")).toBe("2025-11");
    });
  });

  describe("nextMonth", () => {
    it("returns next month in YYYY-MM format", () => {
      expect(nextMonth("2024-02")).toBe("2024-03");
      expect(nextMonth("2024-12")).toBe("2025-01");
      expect(nextMonth("2023-01")).toBe("2023-02");
    });
  });

  describe("monthFromDate", () => {
    it("extracts YYYY-MM from ISO date string", () => {
      expect(monthFromDate("2024-03-15")).toBe("2024-03");
      expect(monthFromDate("2025-12-01")).toBe("2025-12");
    });
  });

  describe("isValidMonth", () => {
    it("accepts valid YYYY-MM between 2000 and 2100", () => {
      expect(isValidMonth("2024-01")).toBe(true);
      expect(isValidMonth("2000-12")).toBe(true);
      expect(isValidMonth("2100-01")).toBe(true);
      expect(isValidMonth("2024-06")).toBe(true);
    });

    it("rejects invalid formats", () => {
      expect(isValidMonth("2024-1")).toBe(false);
      expect(isValidMonth("24-01")).toBe(false);
      expect(isValidMonth("2024/01")).toBe(false);
      expect(isValidMonth("")).toBe(false);
    });

    it("rejects invalid month numbers", () => {
      expect(isValidMonth("2024-00")).toBe(false);
      expect(isValidMonth("2024-13")).toBe(false);
    });

    it("rejects years outside 2000-2100", () => {
      expect(isValidMonth("1999-01")).toBe(false);
      expect(isValidMonth("2101-01")).toBe(false);
    });
  });

  describe("formatMonth", () => {
    it("formats YYYY-MM as human-readable month year", () => {
      const result = formatMonth("2024-03");
      expect(result).toMatch(/March|Mar/);
      expect(result).toMatch("2024");
    });
  });

  describe("normalizeBudgetMonthStartDay", () => {
    it("clamps to 1-28", () => {
      expect(normalizeBudgetMonthStartDay(0)).toBe(1);
      expect(normalizeBudgetMonthStartDay(25)).toBe(25);
      expect(normalizeBudgetMonthStartDay(31)).toBe(28);
    });
  });

  describe("getBudgetPeriodForMonthKey", () => {
    it("uses calendar month when start day is 1", () => {
      const { start, end } = getBudgetPeriodForMonthKey("2024-03", 1);
      expect(start).toBe("2024-03-01");
      expect(end).toBe("2024-03-31");
    });

    it("uses 25th to next 24th when start day is 25", () => {
      const { start, end } = getBudgetPeriodForMonthKey("2024-03", 25);
      expect(start).toBe("2024-03-25");
      expect(end).toBe("2024-04-24");
    });
  });

  describe("budgetMonthKeyFromIsoDate", () => {
    it("maps dates before start day to previous key", () => {
      expect(budgetMonthKeyFromIsoDate("2024-03-20", 25)).toBe("2024-02");
    });

    it("maps dates on or after start day to current key", () => {
      expect(budgetMonthKeyFromIsoDate("2024-03-25", 25)).toBe("2024-03");
      expect(budgetMonthKeyFromIsoDate("2024-03-26", 25)).toBe("2024-03");
    });

    it("matches calendar month when start day is 1", () => {
      expect(budgetMonthKeyFromIsoDate("2024-03-15", 1)).toBe("2024-03");
    });
  });

  describe("formatBudgetMonthLabel", () => {
    it("matches formatMonth for calendar months", () => {
      expect(formatBudgetMonthLabel("2024-03", 1)).toBe(formatMonth("2024-03"));
    });

    it("shows date range for custom start", () => {
      const label = formatBudgetMonthLabel("2024-03", 25);
      expect(label).toContain("25");
      expect(label).toContain("24");
      expect(label).toContain("2024");
    });
  });
});
