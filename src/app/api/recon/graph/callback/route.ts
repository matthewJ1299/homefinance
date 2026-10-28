import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserRepository } from "@/lib/repositories";
import { parseReconOAuthState } from "@/lib/services/recon/graph-oauth.service";
import { ReconService } from "@/lib/services/recon/recon.service";
import { runWithHouseholdFeatures } from "@/lib/features/run-with-household-features";
import { hasFeature } from "@/lib/features/access";

function toReconUrl(request: NextRequest, path: string): URL {
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.APP_BASE_URL ?? request.nextUrl.origin;
  return new URL(path, baseUrl);
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

  const householdId = await getUserRepository().getHouseholdId(userIdFromState);

  try {
    await runWithHouseholdFeatures(householdId, async () => {
      if (!hasFeature("recon")) {
        throw new Error("recon_not_entitled");
      }
      const service = new ReconService();
      await service.saveInitialGraphTokens(userIdFromState, code, pkceVerifier);
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "token_save_failed";
    if (msg === "recon_not_entitled") {
      return NextResponse.redirect(toReconUrl(request, "/recon?error=not_entitled"));
    }
    return NextResponse.redirect(toReconUrl(request, `/recon?error=${encodeURIComponent(msg)}`));
  }

  return NextResponse.redirect(toReconUrl(request, "/recon?connected=1"));
}
