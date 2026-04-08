import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/db/request-context";
import { parseReconOAuthState } from "@/lib/services/recon/graph-oauth.service";
import { ReconService } from "@/lib/services/recon/recon.service";

function toReconUrl(request: NextRequest, path: string): URL {
  return new URL(path, request.nextUrl.origin);
}

export async function GET(request: NextRequest) {
  const err = request.nextUrl.searchParams.get("error");
  const desc = request.nextUrl.searchParams.get("error_description");
  if (err) {
    const msg = desc ?? err;
    return NextResponse.redirect(toReconUrl(request, `/recon?error=${encodeURIComponent(msg)}`));
  }
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(toReconUrl(request, "/recon?error=missing_code_or_state"));
  }

  let userIdFromState: number;
  let pkceVerifier: string;
  try {
    const parsed = parseReconOAuthState(state);
    userIdFromState = parsed.userId;
    pkceVerifier = parsed.pkceVerifier;
  } catch {
    return NextResponse.redirect(toReconUrl(request, "/recon?error=invalid_oauth_state"));
  }

  const session = await auth();
  if (!session?.user?.id || Number(session.user.id) !== userIdFromState) {
    return NextResponse.redirect(toReconUrl(request, "/recon?error=session_mismatch"));
  }

  setRequestContext({
    userId: session.user.id,
    userName: session.user.name ?? undefined,
  });

  try {
    const service = new ReconService();
    await service.saveInitialGraphTokens(userIdFromState, code, pkceVerifier);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "token_save_failed";
    return NextResponse.redirect(toReconUrl(request, `/recon?error=${encodeURIComponent(msg)}`));
  }

  return NextResponse.redirect(toReconUrl(request, "/recon?connected=1"));
}
