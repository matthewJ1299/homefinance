import { describe, expect, it } from "vitest";
import { FEATURE_KEYS, FEATURE_LIST, NAV_HREF_FEATURE } from "@/lib/features/registry";
import { fullNavItems } from "@/components/layout/nav-items";

describe("feature catalogue", () => {
  it("has unique feature keys", () => {
    expect(new Set(FEATURE_KEYS).size).toBe(FEATURE_KEYS.length);
  });

  it("maps every navHref to a real nav item or admin route", () => {
    const knownHrefs = new Set(fullNavItems.map((item) => item.href));
    for (const feature of FEATURE_LIST) {
      for (const href of feature.navHrefs) {
        expect(knownHrefs.has(href)).toBe(true);
        expect(NAV_HREF_FEATURE.get(href)).toBe(feature.key);
      }
    }
  });
});
