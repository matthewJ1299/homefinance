import { describe, it, expect } from "vitest";
import {
  prevMonth,
  nextMonth,
  monthFromDate,
  isValidMonth,
  formatMonth,
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
});
