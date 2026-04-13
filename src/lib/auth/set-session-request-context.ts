import type { Session } from "next-auth";
import { setRequestContext } from "@/lib/db/request-context";

/**
 * Binds AsyncLocalStorage used by the DB layer to the signed-in user and their household.
 * Call at the start of server actions, API routes, and the authenticated app layout.
 */
export function setRequestContextFromSession(session: Session | null): void {
  if (!session?.user) {
    return;
  }
  const rawHid = session.user.householdId;
  const householdId =
    rawHid != null && rawHid !== "" ? Number(rawHid) : undefined;
  setRequestContext({
    userId: session.user.id,
    userName: session.user.name ?? undefined,
    householdId: Number.isFinite(householdId) ? householdId : undefined,
    isSuperAdmin: session.user.isSuperAdmin === true,
  });
}
