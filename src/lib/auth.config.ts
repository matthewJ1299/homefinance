import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUserRepository } from "@/lib/repositories";

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
      const isRegister = nextUrl.pathname.startsWith("/register");
      if (isRegister && !isLoggedIn) {
        return true;
      }
      if (auth?.user && nextUrl.pathname === "/login") {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      if (auth?.user && isRegister) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        if ("householdId" in user && user.householdId != null && user.householdId !== "") {
          token.householdId = String(user.householdId);
        }
        if ("isSuperAdmin" in user && user.isSuperAdmin != null) {
          token.isSuperAdmin = user.isSuperAdmin === true;
        }
      }
      if ((token.householdId == null || token.householdId === "") && token.id != null) {
        const userId = Number(token.id);
        if (Number.isFinite(userId)) {
          try {
            token.householdId = String(await getUserRepository().getHouseholdId(userId));
          } catch {
            // Leave token unchanged; auth() will remain unauthorized for tenant-scoped data.
          }
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id);
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        if (token.householdId != null && token.householdId !== "") {
          session.user.householdId = String(token.householdId);
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
          householdId: String(user.householdId),
          isSuperAdmin: user.isSuperAdmin,
        };
      },
    }),
  ],
};
