import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { requireSuperAdmin } from "@/lib/db/request-context";
import type { Session } from "next-auth";

export async function requireSuperAdminSession(): Promise<
  { session: Session } | { error: string }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }
  setRequestContextFromSession(session);
  try {
    requireSuperAdmin();
  } catch {
    return { error: "Forbidden" };
  }
  return { session };
}
