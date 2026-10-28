import "next-auth";
import type { FeatureKey } from "@/lib/features/registry";
import type { HomeMode } from "@/lib/features/home-mode";

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
      /** Per-user view preference; refreshed from DB each request, not on JWT. */
      homeMode?: HomeMode;
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
