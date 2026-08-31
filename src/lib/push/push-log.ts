/**
 * Client-side push diagnostics. Filter browser console by "[PushClient]".
 */
export function pushClientLog(
  event: string,
  details?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  const payload = details ?? {};
  console.log(`[PushClient] ${event}`, payload);
}
