import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Log so we can see in Coolify/deployment logs whether requests reach the app and which path
  const path = request.nextUrl.pathname;
  const host = request.headers.get("host") ?? "";
  console.log(`[HomeFinance] request host=${host} path=${path}`);
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest).*)"],
};
