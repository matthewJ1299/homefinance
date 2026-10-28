/**
 * Per-user "home mode": whether this user runs the app with envelope budgeting
 * (`budget`) or as a plain spend tracker (`tracker`).
 *
 * This is a **preference**, not an entitlement. The `household_features`
 * catalogue in `./registry.ts` is per-household with no per-user layer; home
 * mode is the opposite -- a personal choice stored on `users.home_mode`, closer
 * to `budget_month_start_day`. It rides on the same per-request resolution path
 * as feature keys (`getAuthState` -> `RequestContext` / session), never the JWT.
 *
 * Because budgeting is already per-user in the data model (`budgets` and
 * `budget_month_opens` are keyed by user, and budget "spent" is strictly the
 * viewer's own share), one user switching to `tracker` hides *their* budget
 * layer and never touches anyone else's.
 *
 * Kept deliberately client-safe -- no `process.env`, db, or service imports --
 * so nav components (`"use client"`) can import the type and guards. The
 * server-side reader lives in `./access.ts` (`getHomeMode` / `isTrackerMode`).
 */

export const HOME_MODES = ["budget", "tracker"] as const;

export type HomeMode = (typeof HOME_MODES)[number];

/** The safe default: nothing accidentally hides a user's budget. */
export const DEFAULT_HOME_MODE: HomeMode = "budget";

/** The union is erased at runtime; a server action is a public HTTP surface. */
export function isHomeMode(value: unknown): value is HomeMode {
  return typeof value === "string" && (HOME_MODES as readonly string[]).includes(value);
}

/** Coerce any stored/loaded value to a valid mode, failing safe to `budget`. */
export function toHomeMode(value: unknown): HomeMode {
  return isHomeMode(value) ? value : DEFAULT_HOME_MODE;
}
