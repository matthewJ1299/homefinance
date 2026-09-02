import NextAuth from "next-auth";
import type { Session } from "next-auth";
import { authConfig } from "./auth.config";
import { setRequestContextFromSession } from "./auth/set-session-request-context";
import { getUserRepository } from "./repositories";

const nextAuth = NextAuth({
  ...authConfig,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
});

export const { handlers, signIn, signOut } = nextAuth;

const baseAuth = nextAuth.auth;

function normalizeHouseholdId(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : undefined;
}

/**
 * Bind the request context (userId, householdId, isSuperAdmin) from a resolved
 * session. Server Components inherit this through the React `cache()` holder;
 * route handlers and server actions must also call
 * `setRequestContextFromSession` themselves (see request-context.ts).
 *
 * Tenant scope and the super-admin flag are read from the **database**, not the
 * JWT: the token is issued for 30 days and is never refreshed, so trusting it
 * would mean an admin revoking super-admin (or moving a user to another
 * household) had no effect until the user signed out. The DB read is one
 * indexed lookup by primary key.
 */
async function bindContextFromSession(session: Session | null): Promise<void> {
  if (!session?.user?.id) return;
  const userId = Number(session.user.id);
  if (Number.isFinite(userId)) {
    try {
      const authState = await getUserRepository().getAuthState(userId);
      if (authState?.householdId != null) {
        session.user.householdId = String(authState.householdId);
      } else {
        // User row is gone, or household_id is still NULL pre-migration: fail
        // closed so tenant-scoped repositories throw instead of leaking rows.
        delete session.user.householdId;
      }
      session.user.isSuperAdmin = authState?.isSuperAdmin === true;
    } catch {
      // DB unreachable: fall back to the token's claim for tenant scope, but
      // never for privilege — an unverifiable super-admin claim is dropped.
      const sessionHouseholdId = normalizeHouseholdId(session.user.householdId);
      if (sessionHouseholdId != null) session.user.householdId = sessionHouseholdId;
      else delete session.user.householdId;
      session.user.isSuperAdmin = false;
    }
  }
  setRequestContextFromSession(session);
}

/**
 * Drop-in replacement for NextAuth's `auth`. The no-argument form (session fetch
 * from a Server Component, route handler, or server action) also binds request
 * context. All other overloads — `auth(req, ctx)` route wrapper and
 * `auth(middleware)` — pass straight through untouched.
 */
export const auth = ((...args: unknown[]) => {
  if (args.length === 0) {
    return (baseAuth as () => Promise<Session | null>)().then(async (session) => {
      await bindContextFromSession(session);
      return session;
    });
  }
  // @ts-expect-error - forward the route-handler / middleware overloads verbatim
  return baseAuth(...args);
}) as typeof baseAuth;
