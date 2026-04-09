import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserRepository } from "@/lib/repositories";
import { buildAuthorizeUrl, createReconOAuthState } from "@/lib/services/recon/graph-oauth.service";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const userId = Number(session.user.id);
  const userRepo = getUserRepository();
  const [reconFeatureAllowed, reconEnabled] = await Promise.all([
    userRepo.getReconFeatureAllowed(userId),
    userRepo.getReconEnabled(userId),
  ]);
  if (!reconFeatureAllowed) {
    return NextResponse.redirect(new URL("/settings?recon=no_access", request.url));
  }
  if (!reconEnabled) {
    return NextResponse.redirect(new URL("/settings?recon=off", request.url));
  }
  const { state, codeChallenge } = createReconOAuthState(userId);
  return NextResponse.redirect(buildAuthorizeUrl(state, codeChallenge));
}