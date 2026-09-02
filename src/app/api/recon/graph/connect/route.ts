import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { hasFeature } from "@/lib/features/access";
import { buildAuthorizeUrl, createReconOAuthState } from "@/lib/services/recon/graph-oauth.service";

export async function GET(request: Request) {
  const session = await auth();
  setRequestContextFromSession(session);
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!hasFeature("recon")) {
    return NextResponse.redirect(new URL("/recon", request.url));
  }
  const userId = Number(session.user.id);
  const { state, codeChallenge } = createReconOAuthState(userId);
  return NextResponse.redirect(buildAuthorizeUrl(state, codeChallenge));
}
