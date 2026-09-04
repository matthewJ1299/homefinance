import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUserRepository } from "@/lib/repositories";

function normalizeHouseholdId(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : undefined;
}

const PUBLIC_AUTH_PATHS = new Set(["/login", "/register"]);

const APP_PREFIXES = [
  "/dashboard",
  "/calendar",
  "/lists",
  "/budget",
  "/expenses",
  "/income",
  "/recon",
  "/splits",
  "/what-i-owe",
  "/budget-ai-report",
  "/accounts",
  "/mortgage",
  "/goals",
  "/summary",
  "/reports",
  "/new-month",
  "/settings",
  "/add",
  "/pending-approval",
  "/welcome",
  "/change-password",
];

function isAppRoute(pathname: string): boolean {
  return APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const pathname = nextUrl.pathname;
      const isLoggedIn = !!auth?.user?.id;

      if (!isLoggedIn) {
        if (PUBLIC_AUTH_PATHS.has(pathname)) return true;
        if (isAppRoute(pathname) || pathname.startsWith("/admin")) return false;
        return true;
      }

      if (pathname === "/login" || pathname === "/register") {
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
