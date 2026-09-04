import { test, expect } from "../fixtures/test";
import { loginAsMatt, skipWelcomeIfPresent } from "../helpers/auth";
import { goNav } from "../helpers/nav";

/** Lightweight route smoke — deep mutations live in specs 12–18. */
test.describe("Core screens smoke", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await page.goto("/dashboard");
    await skipWelcomeIfPresent(page);
  });

  const routes: Array<{ nav: Parameters<typeof goNav>[1]; url: RegExp }> = [
    { nav: "Home", url: /\/dashboard/ },
    { nav: "Transactions", url: /\/expenses/ },
    { nav: "Income", url: /\/income/ },
    { nav: "Budget", url: /\/budget/ },
    { nav: "Accounts", url: /\/accounts/ },
    { nav: "Splits", url: /\/splits/ },
    { nav: "Lists", url: /\/lists/ },
    { nav: "Calendar", url: /\/calendar/ },
    { nav: "Summary", url: /\/summary/ },
    { nav: "Add", url: /\/add/ },
  ];

  for (const route of routes) {
    test(`${route.nav} loads`, async ({ page }) => {
      await goNav(page, route.nav);
      await expect(page).toHaveURL(route.url);
    });
  }
});
