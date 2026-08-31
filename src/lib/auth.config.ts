import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUserRepository } from "@/lib/repositories";

function normalizeHouseholdId(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : undefined;
}

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnApp = nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/expenses") ||
        nextUrl.pathname.startsWith("/income") ||
        nextUrl.pathname.startsWith("/budget") ||
        nextUrl.pathname.startsWith("/mortgage") ||
        nextUrl.pathname.startsWith("/summary") ||
        nextUrl.pathname.startsWith("/categories") ||
        nextUrl.pathname.startsWith("/recon") ||
        nextUrl.pathname.startsWith("/admin");
      if (isOnApp && !isLoggedIn) {
        return false;
      }
      // Public self-registration is disabled; households + users are provisioned
      // from the admin portal. Any /register request falls through to a 404.
      if (auth?.user && nextUrl.pathname === "/login") {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        const normalizedHouseholdId =
          "householdId" in user ? normalizeHouseholdId(user.householdId) : undefined;
        if (normalizedHouseholdId !== undefined) {
          token.householdId = normalizedHouseholdId;
        }
        if ("isSuperAdmin" in user && user.isSuperAdmin != null) {
          token.isSuperAdmin = user.isSuperAdmin === true;
        }
      }
      if (normalizeHouseholdId(token.householdId) == null && token.id != null) {
        const userId = Number(token.id);
        if (Number.isFinite(userId)) {
          try {
            token.householdId = normalizeHouseholdId(await getUserRepository().getHouseholdId(userId));
          } catch {
            // Leave token unchanged; auth() will remain unauthorized for tenant-scoped data.
          }
        }
      }
      token.householdId = normalizeHouseholdId(token.householdId);
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id);
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        const normalizedHouseholdId = normalizeHouseholdId(token.householdId);
        if (normalizedHouseholdId !== undefined) {
          session.user.householdId = normalizedHouseholdId;
        } else {
          delete session.user.householdId;
        }
        if (token.isSuperAdmin != null) {
          session.user.isSuperAdmin = token.isSuperAdmin === true;
        }
      }
      return session;
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const userRepo = getUserRepository();
        const user = await userRepo.findByEmailForAuth(credentials.email as string);
        if (!user) return null;
        const match = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!match) return null;
        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          householdId: normalizeHouseholdId(user.householdId),
          isSuperAdmin: user.isSuperAdmin,
        };
      },
    }),
  ],
};
