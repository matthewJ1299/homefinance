import { describe, expect, it } from "vitest";
import { hasFeature, requireFeature, FeatureNotEntitledError } from "@/lib/features/access";
import { runWithRequestContext } from "@/lib/db/request-context";

describe("request context feature gates", () => {
  it("hasFeature fails closed with no context", () => {
    expect(hasFeature("recon")).toBe(false);
  });

  it("hasFeature reads featureKeys from bound context", () => {
    const entitled = runWithRequestContext({ featureKeys: ["recon", "goals"] }, () =>
      hasFeature("recon")
    );
    expect(entitled).toBe(true);
    const denied = runWithRequestContext({ featureKeys: ["goals"] }, () => hasFeature("recon"));
    expect(denied).toBe(false);
  });

  it("requireFeature throws when not entitled", () => {
    expect(() =>
      runWithRequestContext({ featureKeys: [] }, () => requireFeature("mortgage"))
    ).toThrow(FeatureNotEntitledError);
  });
});
