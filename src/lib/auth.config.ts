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
        nextUrl.pathname.startsWith("/categories");
      if (isOnApp && !isLoggedIn) {
        return false;
      }
      if (auth?.user && nextUrl.pathname === "/login") {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id);
        session.user.email = token.email as string;
        session.user.name = token.name as string;
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
        };
      },
    }),
  ],
};
