import { describe, it, expect } from "vitest";
import {
  amountToStore,
  flowFromStoredAmount,
  flowLabel,
  magnitudeFromStoredAmount,
} from "@/lib/services/recon/recon-flow";
import {
  inferReconFlow,
  parseMinorFromRandText,
} from "@/lib/services/recon/parsers/parse-helpers";
import { parseTypeA } from "@/lib/services/recon/parsers/parse-type-a";
import { parseTypeB } from "@/lib/services/recon/parsers/parse-type-b";

describe("recon flow helpers", () => {
  it("reads direction from the stored sign, defaulting positive to Out", () => {
    expect(flowFromStoredAmount(45000)).toBe("out");
    expect(flowFromStoredAmount(-45000)).toBe("in");
    // Historical rows were all written positive, and a zero is not an inflow.
    expect(flowFromStoredAmount(0)).toBe("out");
  });

  it("magnitude is the absolute value either way", () => {
    expect(magnitudeFromStoredAmount(45000)).toBe(45000);
    expect(magnitudeFromStoredAmount(-45000)).toBe(45000);
  });

  it("stores In as negative and Out as positive from a magnitude", () => {
    expect(amountToStore(5500, "out")).toBe(5500);
    expect(amountToStore(5500, "in")).toBe(-5500);
    // The magnitude is taken as absolute, so a stray sign on the input is ignored.
    expect(amountToStore(-5500, "out")).toBe(5500);
    expect(amountToStore(-5500, "in")).toBe(-5500);
  });

  it("labels the two directions", () => {
    expect(flowLabel("out")).toBe("Out");
    expect(flowLabel("in")).toBe("In");
  });

  it("round-trips magnitude and flow through storage", () => {
    for (const magnitude of [1, 5500, 999999]) {
      for (const flow of ["out", "in"] as const) {
        const stored = amountToStore(magnitude, flow);
        expect(flowFromStoredAmount(stored)).toBe(flow);
        expect(magnitudeFromStoredAmount(stored)).toBe(magnitude);
      }
    }
  });
});

describe("parseMinorFromRandText", () => {
  it("parses a plain rand amount to positive cents", () => {
    expect(parseMinorFromRandText("R 450.00")).toBe(45000);
    expect(parseMinorFromRandText("Amount : R99.00")).toBe(9900);
  });

  it("treats a minus before or after the R as a debit", () => {
    expect(parseMinorFromRandText("-R55.00")).toBe(-5500);
    expect(parseMinorFromRandText("R -55.00")).toBe(-5500);
    expect(parseMinorFromRandText("Amount : -R450.00")).toBe(-45000);
  });

  it("handles thousands separators and comma decimals", () => {
    expect(parseMinorFromRandText("R1,234.56")).toBe(123456);
    expect(parseMinorFromRandText("R55,00")).toBe(5500);
  });

  it("returns null when there is no rand or ZAR amount", () => {
    expect(parseMinorFromRandText("Good day")).toBeNull();
    expect(parseMinorFromRandText("")).toBeNull();
  });
});

describe("inferReconFlow", () => {
  it("a negative signed amount is always Out (a bank debit), even with inflow words", () => {
    expect(inferReconFlow("refund of -R55.00", -5500)).toBe("out");
  });

  it("inflow words mark In when the figure is unsigned", () => {
    expect(inferReconFlow("R5000.00 deposited to your account", 500000)).toBe("in");
    expect(inferReconFlow("Your account was credited", null)).toBe("in");
    expect(inferReconFlow("Salary payment", null)).toBe("in");
    expect(inferReconFlow("refund processed", 5500)).toBe("in");
  });

  it("defaults to Out — what almost every notification is", () => {
    expect(inferReconFlow("Purchase at CHECKERS", 45000)).toBe("out");
    expect(inferReconFlow("Point of sale purchase", null)).toBe("out");
  });
});

describe("bank parsers store signed amounts", () => {
  it("type A: an ABSA debit (minus on the Amount line) is stored positive / Out", () => {
    const parsed = parseTypeA(
      "Amount : -R450.00\nMerchant : CHECKERS HYPER\nDate: 2026-09-15",
      "ABSA NotifyMe"
    );
    expect(parsed).not.toBeNull();
    expect(parsed?.amountMinorUnits).toBe(45000);
    expect(flowFromStoredAmount(parsed!.amountMinorUnits)).toBe("out");
    expect(parsed?.vendor).toBe("CHECKERS HYPER");
  });

  it("type A: an unsigned amount with a credit word is stored negative / In", () => {
    const parsed = parseTypeA(
      "Amount : R5000.00\nYour account was credited\nMerchant : ACME PAYROLL\nDate: 2026-09-16",
      "ABSA NotifyMe"
    );
    expect(parsed?.amountMinorUnits).toBe(-500000);
    expect(flowFromStoredAmount(parsed!.amountMinorUnits)).toBe("in");
  });

  it("type A: a plain purchase with no direction word stays Out", () => {
    const parsed = parseTypeA(
      "Amount : R99.00\nMerchant : SHELL\nDate: 2026-09-10",
      "ABSA NotifyMe"
    );
    expect(parsed?.amountMinorUnits).toBe(9900);
  });

  it("type B: a spend is stored positive / Out", () => {
    const parsed = parseTypeB(
      "R120.50 was spent at @ENGEN on 2026-09-14",
      "FNB inContact"
    );
    expect(parsed?.amountMinorUnits).toBe(12050);
    expect(flowFromStoredAmount(parsed!.amountMinorUnits)).toBe("out");
  });

  it("type B: a deposit is stored negative / In", () => {
    const parsed = parseTypeB(
      "R5,000.00 was deposited into your account on 2026-09-16",
      "FNB inContact"
    );
    expect(parsed?.amountMinorUnits).toBe(-500000);
    expect(flowFromStoredAmount(parsed!.amountMinorUnits)).toBe("in");
  });
});
