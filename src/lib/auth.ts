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
 * Bind the AsyncLocalStorage request context (userId, householdId, isSuperAdmin)
 * from a resolved session. Next.js does NOT propagate the ALS context set in a
 * layout into page/route renders, so every server entry point that calls `auth()`
 * needs the context bound here — this wrapper does it centrally so pages, route
 * handlers and server actions don't each have to remember.
 *
 * Also repairs a missing/invalid `householdId` on older JWT sessions by reading
 * it back from the database (previously done inline in the app layout).
 */
async function bindContextFromSession(session: Session | null): Promise<void> {
  if (!session?.user?.id) return;
  const userId = Number(session.user.id);
  const sessionHouseholdId = normalizeHouseholdId(session.user.householdId);
  if (sessionHouseholdId == null && Number.isFinite(userId)) {
    try {
      session.user.householdId = String(await getUserRepository().getHouseholdId(userId));
    } catch {
      delete session.user.householdId;
    }
  } else if (sessionHouseholdId != null) {
    session.user.householdId = sessionHouseholdId;
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
