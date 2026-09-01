import { cache } from "react";
import { AsyncLocalStorage } from "async_hooks";
import type pg from "pg";

export interface RequestContext {
  userId?: string;
  userName?: string;
  /** Tenant scope for all household-owned rows (see households table). */
  householdId?: number;
  /** True if the authenticated user is a global super-admin. */
  isSuperAdmin?: boolean;
  /** Set by Postgres client after INSERT so lastInsertId() is request-scoped. */
  lastInsertId?: number;
  /** When set, DB calls use this client inside an open transaction. */
  pgClient?: pg.PoolClient;
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
 * Set the current context. In a page this happens via `auth()` (see src/lib/auth.ts);
 * route handlers / actions call it after `auth()` too.
 */
export function setRequestContext(ctx: RequestContext): void {
  const held = reactHolderOrNull();
  if (held) held.ctx = ctx;
  als.enterWith({ ctx });
}

/** Get the current context, if any. */
export function getRequestContext(): RequestContext | undefined {
  const held = reactHolderOrNull();
  if (held && Object.keys(held.ctx).length > 0) return held.ctx;
  return als.getStore()?.ctx;
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

export function requireSuperAdmin(): void {
  const isAllowed = getRequestContext()?.isSuperAdmin === true;
  if (!isAllowed) {
    throw new Error("Forbidden");
  }
}
