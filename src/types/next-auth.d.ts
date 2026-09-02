import "next-auth";
import type { FeatureKey } from "@/lib/features/registry";

declare module "next-auth" {
  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
    /** Numeric households.id as string (JWT-friendly). */
    householdId?: string | null;
    isSuperAdmin?: boolean | null;
  }

  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      householdId?: string | null;
      isSuperAdmin?: boolean | null;
      /** Refreshed from DB each request; not stored on JWT. */
      featureKeys?: FeatureKey[];
      aiTier?: "free" | "paid";
      householdApprovalStatus?: "pending" | "active" | "rejected";
      mustChangePassword?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string | null;
    name?: string | null;
    householdId?: string | null;
    isSuperAdmin?: boolean | null;
  }
}
