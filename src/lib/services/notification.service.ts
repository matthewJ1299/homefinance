import https from "https";
import webpush from "web-push";
import { getPushSubscriptionRepository, getUserRepository } from "@/lib/repositories";

/** Force IPv4 for push requests; avoids ETIMEDOUT/ENETUNREACH when container IPv6 is broken (e.g. Docker on some hosts). */
const pushAgent = new https.Agent({ family: 4 });

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
}

const VAPID_CONTACT = "mailto:support@homefinance.local";
const DEFAULT_TTL = 60;

/**
 * True if the push service response indicates the subscription or VAPID auth is invalid.
 * Apple (iOS): 403 with body {"reason":"BadJwtToken"}.
 * Google/FCM (Android): 403 with body "invalid JWT provided"; 401 for auth errors.
 * Used to show the same "disable then re-enable notifications" message on both platforms.
 */
function isSubscriptionOrAuthError(statusCode: unknown, bodyStr: string): boolean {
  const code = Number(statusCode);
  const body = bodyStr.toLowerCase();
  if (code === 403) {
    return body.includes("badjwttoken") || body.includes("invalid jwt") || body.includes("invalidjwt");
  }
  if (code === 401) {
    return true;
  }
  return false;
}

function getVapidPublicKey(): string {
  const raw = process.env.VAPID_PUBLIC_KEY ?? "";
  return raw.trim();
}

function getVapidPrivateKey(): string {
  const raw = process.env.VAPID_PRIVATE_KEY ?? "";
  return raw.trim();
}

function isVapidConfigured(): boolean {
  return !!(getVapidPublicKey() && getVapidPrivateKey());
}

function ensureVapid(): void {
  if (!isVapidConfigured()) {
    throw new Error("Push not configured (VAPID keys missing)");
  }
  webpush.setVapidDetails(VAPID_CONTACT, getVapidPublicKey(), getVapidPrivateKey());
}

/**
 * Send a push notification to a single subscription. On 410 Gone, deletes the subscription.
 */
async function sendOne(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: NotificationPayload,
  ttl: number = DEFAULT_TTL
): Promise<{ sent: boolean; stale: boolean }> {
  const body = JSON.stringify({
    title: payload.title ?? "HomeFinance",
    body: payload.body ?? "",
    url: payload.url ?? "/",
  });
  try {
    await webpush.sendNotification(
      { endpoint, keys: { p256dh, auth } },
      body,
      { TTL: ttl, agent: pushAgent }
    );
    return { sent: true, stale: false };
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 410 || statusCode === 404) {
      const pushRepo = getPushSubscriptionRepository();
      await pushRepo.deleteByEndpoint(endpoint);
      return { sent: false, stale: true };
    }
    throw err;
  }
}

/**
 * Centralized push notification service. Use for all server-triggered notifications.
 */
export class NotificationService {
  constructor() {
    ensureVapid();
  }

  /**
   * Send to all push subscriptions for the given user.
   * Returns badJwtToken: true if any subscription failed with 403 BadJwtToken (subscription out of date).
   */
  async sendToUser(
    userId: number,
    payload: NotificationPayload,
    options?: { ttl?: number }
  ): Promise<{ sent: number; failed: number; badJwtToken?: boolean }> {
    const pushRepo = getPushSubscriptionRepository();
    const subscriptions = await pushRepo.findByUserId(userId);
    if (subscriptions.length === 0) {
      return { sent: 0, failed: 0 };
    }
    const ttl = options?.ttl ?? DEFAULT_TTL;
    let sent = 0;
    let failed = 0;
    let badJwtToken = false;
    for (const sub of subscriptions) {
      try {
        const result = await sendOne(sub.endpoint, sub.p256dh, sub.auth, payload, ttl);
        if (result.sent) sent++;
        // stale subscriptions are removed in sendOne; don't count as failed
      } catch (err: unknown) {
        failed++;
        const e = err as Record<string, unknown>;
        const statusCode = e?.statusCode ?? (e?.response as { statusCode?: number } | undefined)?.statusCode ?? "?";
        const bodyStr = typeof e?.body === "string" ? e.body : (typeof e?.body === "object" && e?.body !== null ? JSON.stringify(e.body) : "");
        if (isSubscriptionOrAuthError(statusCode, bodyStr)) {
          badJwtToken = true;
        }
        const body = bodyStr.slice(0, 300);
        const message = typeof e?.message === "string" ? e.message : String(err);
        console.error(
          `[Push] send failed | userId=${userId} | endpoint=${sub.endpoint.slice(0, 60)}... | statusCode=${statusCode} | message=${message}${body ? ` | body=${body}` : ""}`
        );
        // Log full error so we see all properties (web-push uses statusCode/body; Apple may return different shape)
        if (err && typeof err === "object") {
          const keys = Object.getOwnPropertyNames(err);
          const extra: Record<string, unknown> = {};
          for (const k of keys) {
            if (k !== "stack") (extra as Record<string, unknown>)[k] = (err as Record<string, unknown>)[k];
          }
          console.error("[Push] send failed (full error)", extra);
        }
      }
    }
    // Log result for observability when testing notifications (e.g. from /api/push/send).
    // Includes user ID, payload summary, and sent/failed counts.
    console.log(
      `[Push] sendToUser result | userId=${userId} | title="${payload.title}" | url="${payload.url ?? "/"}" | sent=${sent} | failed=${failed} | subscriptions=${subscriptions.length}`
    );
    return { sent, failed, ...(badJwtToken ? { badJwtToken: true } : {}) };
  }

  /**
   * Send to all users except the given user (e.g. notify the other household member).
   */
  async sendToAllExcept(
    excludeUserId: number,
    payload: NotificationPayload,
    options?: { ttl?: number }
  ): Promise<{ sent: number; failed: number }> {
    const userRepo = getUserRepository();
    const users = await userRepo.findAllExcept(excludeUserId);
    let sent = 0;
    let failed = 0;
    for (const user of users) {
      const result = await this.sendToUser(user.id, payload, options);
      sent += result.sent;
      failed += result.failed;
    }
    return { sent, failed };
  }

  /**
   * Send to all users with push subscriptions.
   */
  async sendToAll(
    payload: NotificationPayload,
    options?: { ttl?: number }
  ): Promise<{ sent: number; failed: number }> {
    const userRepo = getUserRepository();
    const users = await userRepo.findAll();
    let sent = 0;
    let failed = 0;
    for (const user of users) {
      const result = await this.sendToUser(user.id, payload, options);
      sent += result.sent;
      failed += result.failed;
    }
    return { sent, failed };
  }
}

/**
 * Check if push is configured (VAPID keys set). Use before instantiating NotificationService when optional.
 */
export function isNotificationConfigured(): boolean {
  return isVapidConfigured();
}
