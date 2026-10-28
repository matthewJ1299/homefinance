import { describe, it, expect } from "vitest";
import { buildStory, pickCase } from "@/lib/services/finance/mortgage-story";

const equalNoDeposit = [
  { userId: 1, name: "Matt", depositMinor: 0, monthlyMinor: 1_070_000, projectedShareBp: 5_000 },
  { userId: 2, name: "Sydney", depositMinor: 0, monthlyMinor: 1_070_000, projectedShareBp: 5_000 },
];

const equalWithDeposit = [
  { userId: 2, name: "Sydney", depositMinor: 78_000_000, monthlyMinor: 1_070_000, projectedShareBp: 6_200 },
  { userId: 1, name: "Matt", depositMinor: 0, monthlyMinor: 1_070_000, projectedShareBp: 3_800 },
];

const unequalToTarget = [
  { userId: 2, name: "Sydney", depositMinor: 78_000_000, monthlyMinor: 151_980, projectedShareBp: 5_000 },
  { userId: 1, name: "Matt", depositMinor: 0, monthlyMinor: 1_988_020, projectedShareBp: 5_000 },
];

describe("mortgage story", () => {
  it("picks the case from the numbers alone", () => {
    expect(pickCase(equalNoDeposit)).toBe("equal-no-deposit");
    expect(pickCase(equalWithDeposit)).toBe("equal-with-deposit");
    expect(pickCase(unequalToTarget)).toBe("unequal-to-target");
  });

  it("is deterministic — the same inputs give the same words", () => {
    expect(buildStory({ people: unequalToTarget })).toEqual(
      buildStory({ people: unequalToTarget })
    );
  });

  it("names both people and both monthly shares when the split is uneven", () => {
    const [why] = buildStory({ people: unequalToTarget });
    expect(why.body).toContain("Sydney");
    expect(why.body).toContain("Matt");
    expect(why.body).toContain("R\u00a01\u00a0519,80");
  });

  it("closes on the sentence that explains the fairness", () => {
    const sections = buildStory({ people: unequalToTarget });
    expect(sections.at(-1)!.body).toContain("The uneven split is what makes it fair.");
  });

  it("says nothing needs balancing when nobody put money in", () => {
    const sections = buildStory({ people: equalNoDeposit });
    expect(sections).toHaveLength(1);
    expect(sections[0].body).toContain("Nothing to balance.");
  });

  it("carries the level-out month when one is known", () => {
    const sections = buildStory({ people: unequalToTarget, levelOutLabel: "March 2044" });
    expect(sections.some((s) => s.body.includes("by March 2044"))).toBe(true);
  });

  it("handles a single-person household without a second name", () => {
    const sections = buildStory({
      people: [{ userId: 1, name: "Matt", depositMinor: 50_000_00, monthlyMinor: 2_140_000, projectedShareBp: 10_000 }],
    });
    expect(sections).toHaveLength(1);
    expect(sections[0].body).toContain("Every rand of it is your share.");
  });
});
