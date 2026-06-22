/**
 * Server-side push diagnostics. Filter server logs by "[Push]".
 */
export function pushServerLog(
  event: string,
  details: Record<string, unknown>
): void {
  console.log(`[Push] ${event}`, details);
}

export function vapidPublicKeyFingerprint(): {
  publicKeyStartsWith: string;
  publicKeyEndsWith: string;
  privateKeyStartsWith: string;
} {
  const pub = (process.env.VAPID_PUBLIC_KEY ?? "").trim();
  const priv = (process.env.VAPID_PRIVATE_KEY ?? "").trim();
  return {
    publicKeyStartsWith: pub.slice(0, 6),
    publicKeyEndsWith: pub.length >= 8 ? pub.slice(-8) : "",
    privateKeyStartsWith: priv.slice(0, 6),
  };
}
