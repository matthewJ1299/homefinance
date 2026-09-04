import { test as base, expect } from "@playwright/test";
import { enterAppAs, loginAsMatt, skipWelcomeIfPresent } from "../helpers/auth";
import { E2E } from "../helpers/env";

type Fixtures = {
  /** Matt signed in and past welcome (seeded super-admin). */
  asMatt: void;
  /** Sydney signed in and past welcome. */
  asSydney: void;
};

export const test = base.extend<Fixtures>({
  asMatt: async ({ page }, use) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await use();
  },
  asSydney: async ({ page }, use) => {
    await enterAppAs(page, E2E.sydneyEmail);
    await use();
  },
});

export { expect };
