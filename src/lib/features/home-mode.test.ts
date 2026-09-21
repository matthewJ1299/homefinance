import { describe, it, expect } from "vitest";
import { isHomeMode, toHomeMode, DEFAULT_HOME_MODE } from "./home-mode";

describe("isHomeMode", () => {
  it("accepts the two valid modes", () => {
    expect(isHomeMode("budget")).toBe(true);
    expect(isHomeMode("tracker")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isHomeMode("Budget")).toBe(false);
    expect(isHomeMode("")).toBe(false);
    expect(isHomeMode(null)).toBe(false);
    expect(isHomeMode(undefined)).toBe(false);
    expect(isHomeMode(1)).toBe(false);
  });
});

describe("toHomeMode", () => {
  it("passes valid modes through", () => {
    expect(toHomeMode("tracker")).toBe("tracker");
    expect(toHomeMode("budget")).toBe("budget");
  });

  it("fails safe to budget for unknown, missing, or malformed values", () => {
    expect(DEFAULT_HOME_MODE).toBe("budget");
    expect(toHomeMode(null)).toBe("budget");
    expect(toHomeMode(undefined)).toBe("budget");
    expect(toHomeMode("nonsense")).toBe("budget");
  });
});
