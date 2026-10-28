import { cache } from "react";
import { AsyncLocalStorage } from "async_hooks";
import type pg from "pg";
import type { FeatureKey } from "@/lib/features/registry";
import type { HomeMode } from "@/lib/features/home-mode";

export type HouseholdApprovalStatus = "pending" | "active" | "rejected";

export interface RequestContext {
  userId?: string;
  userName?: string;
  /** Tenant scope for all household-owned rows (see households table). */
  householdId?: number;
  /** True if the authenticated user is a global super-admin. */
  isSuperAdmin?: boolean;
  /**
   * Household feature entitlements for this request, resolved once by `getAuthState`
   * (see src/lib/auth.ts) and read via `hasFeature`/`requireFeature` in
   * `src/lib/features/access.ts`.
   *
   * Never sourced from the JWT: the token lives 30 days and is never refreshed, so a
   * feature an admin revoked would keep working until the user signed out. Same
   * reasoning the file already applies to `isSuperAdmin`.
   */
  featureKeys?: readonly FeatureKey[];
  /** Admin-set AI provider tier for the household (`households.ai_tier`). */
  aiTier?: "free" | "paid";
  /**
   * Per-user view preference (`users.home_mode`): `budget` runs envelope
   * budgeting, `tracker` hides the budget layer. Read fresh from the DB each
   * request by `getAuthState`, like `featureKeys` -- never from the JWT, so a
   * toggle takes effect on the next request. Absent means `budget`.
   */
  homeMode?: HomeMode;
  /** Self-registration approval gate; defaults to active when column is absent. */
  householdApprovalStatus?: HouseholdApprovalStatus;
  /** When true, user must change password before using the app. */
  mustChangePassword?: boolean;
  /**
   * Household budget month start day, memoised for the request by
   * `budgetMonthStartDayForUser`. It is constant for a request and was being
   * re-queried five to eight times per render — the dashboard alone reaches it
   * through `getDefaultBudgetMonthForUser`, `getBudgetPeriodForUserMonth`, a
   * direct call, and again inside the expense and income services.
   *
   * An identity key so it survives into every component of an RSC render tree;
   * always written through `memoiseBudgetMonthStartDay`, never by replacing the
   * context wholesale.
   */
  budgetMonthStartDay?: number;
  /** Set by Postgres client after INSERT so lastInsertId() is request-scoped. */
  lastInsertId?: number;
  /** When set, DB calls use this client inside an open transaction. */
  pgClient?: pg.PoolClient;
  /**
   * Mutable slot for the id of the last INSERT inside an open transaction.
   *
   * It has to be a shared object that `run` mutates, not a value written back
   * with `setRequestContext`. `als.enterWith` inside `run` does not reach the
   * caller's already-suspended frame, so a value written that way is invisible
   * to the `lastInsertId()` call that follows -- outside a transaction the
   * module-level fallback happened to cover that up, and inside one there is no
   * fallback. Created per transaction by `withTransaction`, so nothing is shared
   * between concurrent requests.
   */
  txInsertId?: { value: number | null };
}

/**
 * Request-scoped context storage.
 *
 * Two mechanisms are kept in sync because neither alone covers every entry point:
 *
 * - **React `cache()`** — scoped to a whole Server Component render tree. Next.js
 *   does NOT propagate an `AsyncLocalStorage` store set in a layout into sibling/
 *   child component renders, so pages lost tenant context with ALS alone. `cache()`
 *   does propagate across every async boundary in an RSC render, and is isolated
 *   per request (no cross-request bleed).
 * - **`AsyncLocalStorage`** — covers route handlers, server actions, and (via
 *   `runWithRequestContext`) background jobs, where `cache()` is not memoised.
 *
 * `setRequestContext` writes both; `getRequestContext` prefers the populated
 * `cache()` holder (RSC) then falls back to the ALS store.
 */
const als = new AsyncLocalStorage<{ ctx: RequestContext }>();

// One holder object per RSC render tree (React memoises by fn identity).
const reactHolder = cache((): { ctx: RequestContext } => ({ ctx: {} }));

function reactHolderOrNull(): { ctx: RequestContext } | null {
  try {
    return reactHolder();
  } catch {
    return null;
  }
}

/**
 * Identity is safe to share across a whole request; `pgClient` and `lastInsertId`
 * are NOT. They describe one in-flight statement chain, so they live only in
 * AsyncLocalStorage. Putting them in the shared holder would let an open
 * transaction's client leak into concurrent queries elsewhere in the same render
 * (node-pg clients are not concurrency-safe, and those queries would silently
 * join a transaction that may roll back), and would make `lastInsertId()`
 * readable across unrelated inserts.
 */
const IDENTITY_KEYS = [
  "userId",
  "userName",
  "householdId",
  "isSuperAdmin",
  "featureKeys",
  "aiTier",
  "homeMode",
  "householdApprovalStatus",
  "mustChangePassword",
  "budgetMonthStartDay",
] as const;

function identityOf(ctx: RequestContext): RequestContext {
  const out: RequestContext = {};
  for (const k of IDENTITY_KEYS) {
    if (ctx[k] !== undefined) (out as Record<string, unknown>)[k] = ctx[k];
  }
  return out;
}

/**
 * Set the current context. In a page this happens via `auth()` (see src/lib/auth.ts);
 * route handlers / actions call it after `auth()` too.
 *
 * A context carrying no identity (e.g. the `{ pgClient }` update from
 * `withTransaction`, or `{}` to clear it) updates only the async-local store and
 * deliberately leaves the shared per-request identity alone.
 */
export function setRequestContext(ctx: RequestContext): void {
  const identity = identityOf(ctx);
  const held = reactHolderOrNull();
  if (held && Object.keys(identity).length > 0) held.ctx = identity;
  als.enterWith({ ctx });
}

/** Get the current context, if any. Async-local state wins over shared identity. */
export function getRequestContext(): RequestContext | undefined {
  const held = reactHolderOrNull();
  const base = held && Object.keys(held.ctx).length > 0 ? held.ctx : undefined;
  const store = als.getStore()?.ctx;
  if (!base && !store) return undefined;
  const merged: RequestContext = { ...base };
  if (store) {
    for (const [k, v] of Object.entries(store)) {
      if (v !== undefined) (merged as Record<string, unknown>)[k] = v;
    }
  }
  return merged;
}

/**
 * Run `fn` with an explicit context bound via AsyncLocalStorage. Use for work that
 * runs outside a server request (background jobs / schedulers).
 */
export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return als.run({ ctx }, fn);
}

/**
 * Returns the current request household id or throws if missing.
 * Call after setRequestContext from an authenticated session.
 */
export function requireHouseholdId(): number {
  const hid = getRequestContext()?.householdId;
  if (hid == null || !Number.isFinite(hid)) {
    throw new Error(
      "Missing household context. Sign out and sign in again after upgrading, or ensure the app layout set request context."
    );
  }
  return hid;
}

/**
 * Caches the resolved budget month start day for the rest of the request.
 *
 * Merges onto the current context rather than replacing it: `setRequestContext`
 * overwrites the shared identity holder wholesale, so passing only this field
 * would wipe `userId` and `householdId` and every tenant-scoped repository would
 * start throwing.
 */
export function memoiseBudgetMonthStartDay(day: number): void {
  const current = getRequestContext();
  if (!current) return;
  setRequestContext({ ...current, budgetMonthStartDay: day });
}

/** Clears the memo after the household setting changes within one request. */
export function clearBudgetMonthStartDayMemo(): void {
  const current = getRequestContext();
  if (!current) return;
  const next = { ...current };
  delete next.budgetMonthStartDay;
  setRequestContext(next);
}

export function requireSuperAdmin(): void {
  const isAllowed = getRequestContext()?.isSuperAdmin === true;
  if (!isAllowed) {
    throw new Error("Forbidden");
  }
}
