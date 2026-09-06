import { test, expect } from "../fixtures/test";
import { loginAsMatt, skipWelcomeIfPresent } from "../helpers/auth";
import {
  enableAllSeededFeatures,
  openSeededHousehold,
  setHouseholdFeature,
} from "../helpers/admin";
import {
  expectFeatureUnavailable,
  expectNavHidden,
  expectNavVisible,
  goNav,
  type NavLabel,
} from "../helpers/nav";

const GATES: Array<{
  label: string;
  featureKey: "ai_budget_analysis" | "recon" | "what_i_owe" | "mortgage" | "goals";
  nav: NavLabel;
  path: string;
}> = [
  {
    label: "AI budget analysis",
    featureKey: "ai_budget_analysis",
    nav: "Budget AI report",
    path: "/budget-ai-report",
  },
  {
    label: "Bank email reconciliation (Recon)",
    featureKey: "recon",
    nav: "From your bank",
    path: "/recon",
  },
  {
    label: "What I owe",
    featureKey: "what_i_owe",
    nav: "What I owe",
    path: "/what-i-owe",
  },
  { label: "Mortgage", featureKey: "mortgage", nav: "Mortgage", path: "/mortgage" },
  { label: "Goals", featureKey: "goals", nav: "Goals", path: "/goals" },
];

test.describe("Household feature gating", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await page.goto("/dashboard");
    await skipWelcomeIfPresent(page);
  });

  test.afterEach(async ({ page }) => {
    try {
      await loginAsMatt(page);
      await skipWelcomeIfPresent(page);
      await enableAllSeededFeatures(page);
    } catch {
      // best-effort cleanup
    }
  });

  test("Settings has no AI / Recon / What I owe entitlement toggles", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByText("AI analysis", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Bank email reconciliation")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "What I owe" })).toHaveCount(0);
  });

  for (const gate of GATES) {
    test(`${gate.label}: off hides nav + blocks page; on restores`, async ({ page }) => {
      await openSeededHousehold(page);
      await setHouseholdFeature(page, gate.featureKey, false);

      await page.goto("/dashboard");
      await expectNavHidden(page, gate.nav);
      await page.goto(gate.path);
      await expectFeatureUnavailable(page, gate.featureKey);

      await openSeededHousehold(page);
      await setHouseholdFeature(page, gate.featureKey, true);

      await page.goto("/dashboard");
      await expectNavVisible(page, gate.nav);
      await goNav(page, gate.nav);
      await expect(page.getByTestId("feature-unavailable")).toHaveCount(0);
    });
  }
});
