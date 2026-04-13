import "next-auth";

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
