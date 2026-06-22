import { AsyncLocalStorage } from "async_hooks";
import type pg from "pg";

export interface RequestContext {
  userId?: string;
  userName?: string;
  /** Set by Postgres client after INSERT so lastInsertId() is request-scoped. */
  lastInsertId?: number;
  /** When set, DB calls use this client inside an open transaction. */
  pgClient?: pg.PoolClient;
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
