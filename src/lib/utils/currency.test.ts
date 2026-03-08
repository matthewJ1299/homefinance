import { describe, it, expect } from "vitest";
import { toMinorUnits, fromMinorUnits, formatRand } from "./currency";

describe("currency", () => {
  describe("toMinorUnits", () => {
    it("converts rands to cents by multiplying by 100", () => {
      expect(toMinorUnits(0)).toBe(0);
      expect(toMinorUnits(1)).toBe(100);
      expect(toMinorUnits(10)).toBe(1000);
      expect(toMinorUnits(1.5)).toBe(150);
      expect(toMinorUnits(99.99)).toBe(9999);
    });

    it("rounds to nearest integer", () => {
      expect(toMinorUnits(1.234)).toBe(123);
      expect(toMinorUnits(1.235)).toBe(124);
    });
  });

  describe("fromMinorUnits", () => {
    it("converts cents to rands by dividing by 100", () => {
      expect(fromMinorUnits(0)).toBe(0);
      expect(fromMinorUnits(100)).toBe(1);
      expect(fromMinorUnits(1000)).toBe(10);
      expect(fromMinorUnits(150)).toBe(1.5);
      expect(fromMinorUnits(9999)).toBe(99.99);
    });
  });

  describe("round-trip", () => {
    it("fromMinorUnits(toMinorUnits(x)) preserves value for whole rands", () => {
      expect(fromMinorUnits(toMinorUnits(50))).toBe(50);
      expect(fromMinorUnits(toMinorUnits(100))).toBe(100);
    });

    it("fromMinorUnits(toMinorUnits(x)) is close for decimals (rounding)", () => {
      const x = 12.34;
      expect(fromMinorUnits(toMinorUnits(x))).toBe(12.34);
    });
  });

  describe("formatRand", () => {
    it("formats cents as ZAR currency string", () => {
      const result = formatRand(12345);
      expect(result).toMatch(/123[,.]45/);
      expect(result).toMatch(/R|ZAR|R\s?/);
    });

    it("formats zero correctly", () => {
      const result = formatRand(0);
      expect(result).toMatch(/0[,.]00/);
    });
  });
});
