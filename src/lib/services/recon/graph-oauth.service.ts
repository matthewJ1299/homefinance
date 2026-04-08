import { encryptString, decryptString } from "./token-crypto";
import crypto from "node:crypto";

const DEFAULT_SCOPE = "offline_access Mail.Read User.Read";

export interface GraphTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

interface ReconOAuthStatePayload {
  userId: number;
  exp: number;
  pkceVerifier: string;
}

function getEnv(): { clientId: string; clientSecret: string; tenant: string } {
  const clientId = process.env.GRAPH_OAUTH_CLIENT_ID ?? process.env.MICROSOFT_GRAPH_CLIENT_ID;
  const clientSecret = process.env.GRAPH_OAUTH_CLIENT_SECRET ?? process.env.MICROSOFT_GRAPH_CLIENT_SECRET;
  const tenant = process.env.GRAPH_OAUTH_TENANT ?? process.env.MICROSOFT_GRAPH_TENANT ?? "common";
  if (!clientId || !clientSecret) {
    throw new Error(
      "Set GRAPH_OAUTH_CLIENT_ID and GRAPH_OAUTH_CLIENT_SECRET (or MICROSOFT_GRAPH_*) for Outlook recon."
    );
  }
  return { clientId, clientSecret, tenant };
}

function getBaseUrl(): string {
  const u = process.env.NEXTAUTH_URL ?? process.env.APP_BASE_URL;
  if (!u) {
    throw new Error("Set NEXTAUTH_URL (or APP_BASE_URL) for Graph OAuth redirect.");
  }
  return u.replace(/\/$/, "");
}

export function getGraphRedirectUri(): string {
  return `${getBaseUrl()}/api/recon/graph/callback`;
}

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createPkceVerifier(): string {
  return base64UrlEncode(crypto.randomBytes(32));
}

function createPkceChallengeS256(verifier: string): string {
  return base64UrlEncode(crypto.createHash("sha256").update(verifier).digest());
}

export function buildAuthorizeUrl(state: string, codeChallenge: string): string {
  const { clientId, tenant } = getEnv();
  const redirectUri = getGraphRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: DEFAULT_SCOPE,
    state,
    prompt: "consent",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
}

export function createReconOAuthState(userId: number): { state: string; codeChallenge: string } {
  const pkceVerifier = createPkceVerifier();
  const payload: ReconOAuthStatePayload = { userId, exp: Date.now() + 10 * 60 * 1000, pkceVerifier };
  return { state: encryptString(JSON.stringify(payload)), codeChallenge: createPkceChallengeS256(pkceVerifier) };
}

export function parseReconOAuthState(state: string): { userId: number; pkceVerifier: string } {
  const raw = JSON.parse(decryptString(state)) as ReconOAuthStatePayload;
  if (typeof raw.userId !== "number" || !Number.isFinite(raw.userId)) {
    throw new Error("Invalid OAuth state");
  }
  if (Date.now() > raw.exp) {
    throw new Error("OAuth state expired");
  }
  if (typeof raw.pkceVerifier !== "string" || raw.pkceVerifier.length < 20) {
    throw new Error("Invalid OAuth state");
  }
  return { userId: raw.userId, pkceVerifier: raw.pkceVerifier };
}

export async function exchangeCodeForTokens(code: string, pkceVerifier: string): Promise<GraphTokenResponse> {
  const { clientId, clientSecret, tenant } = getEnv();
  const redirectUri = getGraphRedirectUri();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    scope: DEFAULT_SCOPE,
    code_verifier: pkceVerifier,
  });
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as GraphTokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<GraphTokenResponse> {
  const { clientId, clientSecret, tenant } = getEnv();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: DEFAULT_SCOPE,
  });
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }
  return (await res.json()) as GraphTokenResponse;
}
