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
 * Identity is safe to share across a whole request; `pgClient` and `lastInsertId`
 * are NOT. They describe one in-flight statement chain, so they live only in
 * AsyncLocalStorage. Putting them in the shared holder would let an open
 * transaction's client leak into concurrent queries elsewhere in the same render
 * (node-pg clients are not concurrency-safe, and those queries would silently
 * join a transaction that may roll back), and would make `lastInsertId()`
 * readable across unrelated inserts.
 */
const IDENTITY_KEYS = ["userId", "userName", "householdId", "isSuperAdmin"] as const;

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

export function requireSuperAdmin(): void {
  const isAllowed = getRequestContext()?.isSuperAdmin === true;
  if (!isAllowed) {
    throw new Error("Forbidden");
  }
}
