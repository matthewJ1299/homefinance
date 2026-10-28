/**
 * VAPID env check without importing web-push (safe for instrumentation bundle).
 *
 * MUST read the same `VAPID_PUBLIC_KEY` the rest of the app uses to subscribe
 * (`/api/push/vapid-public`) and to sign (`NotificationService`). This gate is
 * the one the notification scheduler consults before sending the daily summary
 * and every per-event reminder; when it reads a different env name than the
 * deployment actually sets, both scheduled jobs silently bail on every tick and
 * no push ever lands -- while a manual /api/push/send test still works because
 * it is gated separately. `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is accepted only as a
 * fallback for a deployment that happened to use that name.
 */
export function isPushEnvConfigured(): boolean {
  const publicKey = (
    process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  )?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  return Boolean(publicKey && privateKey);
}
