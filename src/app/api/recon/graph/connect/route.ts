import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildAuthorizeUrl, createReconOAuthState } from "@/lib/services/recon/graph-oauth.service";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const userId = Number(session.user.id);
  const state = createReconOAuthState(userId);
  return NextResponse.redirect(buildAuthorizeUrl(state));
}