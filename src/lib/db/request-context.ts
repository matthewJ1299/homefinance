import { AsyncLocalStorage } from "async_hooks";

export interface RequestContext {
  userId?: string;
  userName?: string;
  /** Tenant scope for all household-owned rows (see households table). */
  householdId?: number;
  /** True if the authenticated user is a global super-admin. */
  isSuperAdmin?: boolean;
  /** Set by Postgres client after INSERT so lastInsertId() is request-scoped. */
  lastInsertId?: number;
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

const requestStore = new AsyncLocalStorage<RequestContext>();

/**
 * Set the current request context (who is making the request).
 * Call this at the start of layout, server actions, and API routes after auth().
 */
export function setRequestContext(ctx: RequestContext): void {
  requestStore.enterWith(ctx);
}

/**
 * Get the current request context, if any.
 */
export function getRequestContext(): RequestContext | undefined {
  return requestStore.getStore();
}
