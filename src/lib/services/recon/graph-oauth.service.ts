import { encryptString, decryptString } from "./token-crypto";

const DEFAULT_SCOPE = "offline_access Mail.Read User.Read";

export interface GraphTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
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

export function buildAuthorizeUrl(state: string): string {
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
  });
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
}

export function createReconOAuthState(userId: number): string {
  return encryptString(JSON.stringify({ userId, exp: Date.now() + 10 * 60 * 1000 }));
}

export function parseReconOAuthState(state: string): number {
  const raw = JSON.parse(decryptString(state)) as { userId: number; exp: number };
  if (typeof raw.userId !== "number" || !Number.isFinite(raw.userId)) {
    throw new Error("Invalid OAuth state");
  }
  if (Date.now() > raw.exp) {
    throw new Error("OAuth state expired");
  }
  return raw.userId;
}

export async function exchangeCodeForTokens(code: string): Promise<GraphTokenResponse> {
  const { clientId, clientSecret, tenant } = getEnv();
  const redirectUri = getGraphRedirectUri();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    scope: DEFAULT_SCOPE,
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
