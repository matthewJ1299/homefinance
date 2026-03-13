import webpush from "web-push";
import { getPushSubscriptionRepository, getUserRepository } from "@/lib/repositories";

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
}

const VAPID_CONTACT = "mailto:support@homefinance.local";
const DEFAULT_TTL = 60;

function isVapidConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function ensureVapid(): void {
  if (!isVapidConfigured()) {
    throw new Error("Push not configured (VAPID keys missing)");
  }
  webpush.setVapidDetails(
    VAPID_CONTACT,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
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
      { TTL: ttl }
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
   */
  async sendToUser(
    userId: number,
    payload: NotificationPayload,
    options?: { ttl?: number }
  ): Promise<{ sent: number; failed: number }> {
    const pushRepo = getPushSubscriptionRepository();
    const subscriptions = await pushRepo.findByUserId(userId);
    if (subscriptions.length === 0) {
      return { sent: 0, failed: 0 };
    }
    const ttl = options?.ttl ?? DEFAULT_TTL;
    let sent = 0;
    let failed = 0;
    for (const sub of subscriptions) {
      try {
        const result = await sendOne(sub.endpoint, sub.p256dh, sub.auth, payload, ttl);
        if (result.sent) sent++;
        // stale subscriptions are removed in sendOne; don't count as failed
      } catch {
        failed++;
      }
    }
    // Log result for observability when testing notifications (e.g. from /api/push/send).
    // Includes user ID, payload summary, and sent/failed counts.
    console.log(
      `[Push] sendToUser result | userId=${userId} | title="${payload.title}" | url="${payload.url ?? "/"}" | sent=${sent} | failed=${failed} | subscriptions=${subscriptions.length}`
    );
    return { sent, failed };
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
