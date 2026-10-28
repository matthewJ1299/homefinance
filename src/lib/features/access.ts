import { getRequestContext } from "@/lib/db/request-context";
import { FEATURES, type FeatureKey } from "./registry";
import { DEFAULT_HOME_MODE, type HomeMode } from "./home-mode";

/**
 * Household feature entitlements for the current request.
 *
 * Resolved once per request by `getAuthState` (see src/lib/auth.ts) and carried in
 * `RequestContext`, so every gate below is a synchronous in-memory check with no
 * database round trip.
 *
 * Empty when there is no request context — an unauthenticated caller, or a
 * background job that did not bind entitlements. That fails closed by design.
 *
 * Super-admins get **no** implicit bypass: a super-admin belongs to a household and
 * sees exactly what that household is sold, so support can reproduce what a customer
 * sees. Access to `/admin` itself is governed by `requireSuperAdmin()`, which is a
 * separate concern.
 */
export function getEntitledFeatureKeys(): readonly FeatureKey[] {
  return getRequestContext()?.featureKeys ?? [];
}

export function hasFeature(key: FeatureKey): boolean {
  return getEntitledFeatureKeys().includes(key);
}

export function featureDeniedMessage(key: FeatureKey): string {
  return FEATURES[key].deniedMessage;
}

export class FeatureNotEntitledError extends Error {
  readonly featureKey: FeatureKey;

  constructor(featureKey: FeatureKey) {
    super(FEATURES[featureKey].deniedMessage);
    this.name = "FeatureNotEntitledError";
    this.featureKey = featureKey;
  }
}

/** Throws `FeatureNotEntitledError` when the household is not entitled to `key`. */
export function requireFeature(key: FeatureKey): void {
  if (!hasFeature(key)) {
    throw new FeatureNotEntitledError(key);
  }
}

/**
 * The current user's home mode, resolved for this request by `getAuthState`.
 * Fails safe to `budget` when there is no request context (unauthenticated
 * caller, or a background job that did not bind it) -- nothing accidentally
 * hides a user's budget.
 */
export function getHomeMode(): HomeMode {
  return getRequestContext()?.homeMode ?? DEFAULT_HOME_MODE;
}

/** True when the user has switched budgeting off (plain spend tracker). */
export function isTrackerMode(): boolean {
  return getHomeMode() === "tracker";
}
