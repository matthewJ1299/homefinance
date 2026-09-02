/** VAPID env check without importing web-push (safe for instrumentation bundle). */
export function isPushEnvConfigured(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  return Boolean(publicKey && privateKey);
}
