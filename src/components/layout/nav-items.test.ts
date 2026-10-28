import { describe, it, expect } from "vitest";
import {
  fullNavItems,
  bottomNavItemsFor,
  navItemsForHomeMode,
  BUDGET_MODE_HREFS,
} from "./nav-items";

describe("navItemsForHomeMode", () => {
  it("leaves items untouched in budget mode", () => {
    expect(navItemsForHomeMode(fullNavItems, "budget")).toEqual(fullNavItems);
  });

  it("drops the budget cluster in tracker mode", () => {
    const hrefs = navItemsForHomeMode(fullNavItems, "tracker").map((i) => i.href);
    expect(hrefs).not.toContain("/budget");
    expect(hrefs).not.toContain("/goals");
    expect(hrefs).not.toContain("/budget-ai-report");
  });

  it("keeps every non-budget item in tracker mode", () => {
    const kept = navItemsForHomeMode(fullNavItems, "tracker").map((i) => i.href);
    for (const item of fullNavItems) {
      if (BUDGET_MODE_HREFS.has(item.href)) continue;
      expect(kept).toContain(item.href);
    }
  });
});

describe("bottomNavItemsFor", () => {
  it("shows Budget in budget mode", () => {
    const hrefs = bottomNavItemsFor("budget").map((i) => i.href);
    expect(hrefs).toContain("/budget");
    expect(hrefs).not.toContain("/accounts");
  });

  it("swaps Budget for Accounts in tracker mode", () => {
    const hrefs = bottomNavItemsFor("tracker").map((i) => i.href);
    expect(hrefs).toContain("/accounts");
    expect(hrefs).not.toContain("/budget");
  });

  it("keeps four items so the bar layout is unchanged", () => {
    expect(bottomNavItemsFor("budget")).toHaveLength(4);
    expect(bottomNavItemsFor("tracker")).toHaveLength(4);
  });
});
