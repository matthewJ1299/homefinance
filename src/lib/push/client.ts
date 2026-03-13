/**
 * Client-side Web Push helpers: get VAPID public key, subscribe, and register with the API.
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushSubscriptionState {
  supported: boolean;
  permission: NotificationPermission | null;
  subscribed: boolean;
  error: string | null;
}

/**
 * Check if push is supported (HTTPS, service worker, PushManager, Notification).
 */
export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    window.isSecureContext
  );
}

/**
 * Get current notification permission.
 */
export function getNotificationPermission(): NotificationPermission | null {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  return Notification.permission;
}

/**
 * Subscribe to push: request permission, get VAPID key, subscribe via SW, POST to API.
 * Returns the subscription JSON on success, or throws.
 */
export async function subscribeToPush(): Promise<PushSubscriptionJSON> {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  const res = await fetch(`/api/push/vapid-public?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to get push configuration");
  }
  const { publicKey } = (await res.json()) as { publicKey: string };
  if (!publicKey) throw new Error("No VAPID public key");

  const reg = await navigator.serviceWorker.ready;
  const keyBytes = urlBase64ToUint8Array(publicKey);
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes as BufferSource,
  });

  const subscriptionJson = sub.toJSON() as PushSubscriptionJSON;

  const subRes = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscriptionJson),
    credentials: "same-origin",
  });
  if (!subRes.ok) {
    const data = await subRes.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to register subscription");
  }

  return subscriptionJson;
}

/**
 * Unsubscribe: remove from server. Pass the endpoint from the current subscription.
 */
export async function unsubscribeFromPush(endpoint: string): Promise<void> {
  const res = await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
    credentials: "same-origin",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to unsubscribe");
  }
}

/**
 * Get current push subscription from the service worker (if any).
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}
