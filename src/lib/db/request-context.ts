import { AsyncLocalStorage } from "async_hooks";

export interface RequestContext {
  userId?: string;
  userName?: string;
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
