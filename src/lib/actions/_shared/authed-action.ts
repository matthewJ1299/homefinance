import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { FeatureNotEntitledError } from "@/lib/features/access";

/**
 * The shape every server action in this codebase returns: never throw, always
 * report. See docs/mutations-ux.md -- the client's rollback path depends on it.
 */
export type ActionFailure = {
  success: false;
  error: string;
  /**
   * True when this came from an exception rather than a rule the user broke.
   *
   * Validation ("Pick a day between 1 and 28") is the app working correctly and
   * gets a plain toast. A genuine failure gets the "Tell us" affordance, so the
   * distinction has to be made where it is actually known: here, in the catch.
   */
  reportable?: true;
};

export interface AuthedActionContext {
  session: Session;
  userId: number;
}

/**
 * Auth, request context, and the failure contract, in one place.
 *
 * Half the action files had no `try` at all, so a repository error propagated as
 * an unhandled server-action rejection -- which the client sees as an opaque
 * Next.js error rather than a toast, and which silently skips the optimistic
 * rollback. Wrapping makes the contract structural instead of conventional.
 *
 * Also stops raw error text reaching the browser in production: a Postgres
 * message names columns and constraints, which is not something a user can act
 * on and not something worth publishing.
 */
export async function authedAction<R extends { success: boolean }>(
  handler: (ctx: AuthedActionContext) => Promise<R | ActionFailure>,
  options: { onError?: string } = {}
): Promise<R | ActionFailure> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContextFromSession(session);

  const userId = Number(session.user.id);
  if (!Number.isFinite(userId)) {
    return { success: false, error: "Session expired. Please sign in again." };
  }

  try {
    return await handler({ session, userId });
  } catch (err) {
    // An entitlement error is meant for the user: it says which feature and what
    // to do about it.
    if (err instanceof FeatureNotEntitledError) {
      // Not reportable: the household simply is not sold this, which is a
      // billing conversation rather than a bug.
      return { success: false, error: err.message };
    }
    console.error("[action] unhandled error:", err);
    if (process.env.NODE_ENV !== "production" && err instanceof Error) {
      return { success: false, error: err.message, reportable: true };
    }
    return {
      success: false,
      error: options.onError ?? "Something went wrong. Try again.",
      reportable: true,
    };
  }
}
