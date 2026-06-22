/**
 * Client-side Web Push helpers: get VAPID public key, subscribe, and register with the API.
 */

import { pushClientLog } from "@/lib/push/push-log";
import { waitForPushServiceWorkerRegistration } from "@/lib/push/wait-for-service-worker";
import {
  clearStoredVapidSuffix,
  getStoredVapidSuffix,
  storeVapidSuffix,
  vapidSuffixMismatch,
} from "@/lib/push/vapid-fingerprint";
import { isAndroid, isAndroidPwa, isStandalone } from "@/lib/utils/device-detection";

function pushRuntimeContext(): Record<string, unknown> {
  return {
    android: isAndroid(),
    androidPwa: isAndroidPwa(),
    standalone: isStandalone(),
    permission: typeof Notification !== "undefined" ? Notification.permission : null,
  };
}

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

export interface PushServerStatus {
  hasServerSubscription: boolean;
  subscriptionCount: number;
  pushConfigured: boolean;
  vapidPublicKeyEndsWith: string;
}

async function fetchVapidPublicKey(): Promise<string> {
  const res = await fetch(`/api/push/vapid-public?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Failed to get push configuration");
  }
  const { publicKey } = (await res.json()) as { publicKey: string };
  if (!publicKey) throw new Error("No VAPID public key");
  return publicKey;
}

async function registerSubscriptionOnServer(subscriptionJson: PushSubscriptionJSON): Promise<void> {
  const subRes = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscriptionJson),
    credentials: "same-origin",
  });
  if (!subRes.ok) {
    const data = await subRes.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Failed to register subscription");
  }
}

async function unregisterBrowserSubscription(sub: PushSubscription): Promise<void> {
  try {
    await unsubscribeFromPush(sub.endpoint);
  } catch (e) {
    pushClientLog("unregister-server-failed", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
  try {
    await sub.unsubscribe();
  } catch (e) {
    pushClientLog("unregister-browser-failed", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
  clearStoredVapidSuffix();
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
 * Server-side subscription state for the signed-in user.
 */
export async function fetchPushServerStatus(): Promise<PushServerStatus | null> {
  try {
    const res = await fetch("/api/push/status", { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return null;
    return (await res.json()) as PushServerStatus;
  } catch (e) {
    pushClientLog("server-status-failed", {
      message: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

/**
 * Subscribe to push: request permission, get VAPID key, subscribe via SW, POST to API.
 * Re-subscribes when the browser subscription was created with a different VAPID key.
 */
export async function subscribeToPush(): Promise<PushSubscriptionJSON> {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  const publicKey = await fetchVapidPublicKey();
  const storedSuffix = getStoredVapidSuffix();

  const reg = await waitForPushServiceWorkerRegistration();
  let existing = await reg.pushManager.getSubscription();

  if (existing && vapidSuffixMismatch(storedSuffix, publicKey)) {
    pushClientLog("vapid-mismatch-resubscribe", {
      storedSuffix,
      currentSuffix: publicKey.slice(-8),
    });
    await unregisterBrowserSubscription(existing);
    existing = null;
  }

  if (existing) {
    const existingJson = existing.toJSON() as PushSubscriptionJSON;
    pushClientLog("subscribe-reuse-existing", {
      endpointPrefix: existing.endpoint.slice(0, 60),
    });
    await registerSubscriptionOnServer(existingJson);
    storeVapidSuffix(publicKey);
    return existingJson;
  }

  if (Notification.permission === "default") {
    const result = await Notification.requestPermission();
    pushClientLog("permission-request", { result });
    if (result !== "granted") {
      throw new Error("Notification permission was not granted.");
    }
  } else if (Notification.permission === "denied") {
    throw new Error("Notifications are blocked for this site.");
  }

  const keyBytes = urlBase64ToUint8Array(publicKey);
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes as BufferSource,
  });
  const subscriptionJson = sub.toJSON() as PushSubscriptionJSON;
  pushClientLog("subscribe-new", { endpointPrefix: sub.endpoint.slice(0, 60) });
  await registerSubscriptionOnServer(subscriptionJson);
  storeVapidSuffix(publicKey);

  return subscriptionJson;
}

/**
 * Unsubscribe: remove from server. Pass the endpoint from the current subscription.
 */
export async function unsubscribeFromPush(endpoint: string): Promise<void> {
  pushClientLog("unsubscribe-server", { endpointPrefix: endpoint.slice(0, 60) });
  const res = await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
    credentials: "same-origin",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Failed to unsubscribe");
  }
}

/**
 * Get current push subscription from the service worker (if any).
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await waitForPushServiceWorkerRegistration();
    return reg.pushManager.getSubscription();
  } catch (e) {
    pushClientLog("get-subscription-failed", {
      ...pushRuntimeContext(),
      message: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

/**
 * Re-sync existing browser subscription with the server on app reopen/resume.
 */
export async function syncPushSubscriptionWithServer(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const sub = await getCurrentSubscription();
  if (!sub) {
    pushClientLog("sync-no-browser-subscription", {
      permission: getNotificationPermission(),
    });
    return null;
  }
  await registerSubscriptionOnServer(sub.toJSON() as PushSubscriptionJSON);
  const publicKey = await fetchVapidPublicKey();
  storeVapidSuffix(publicKey);
  pushClientLog("sync-ok", { endpointPrefix: sub.endpoint.slice(0, 60) });
  return sub;
}

/**
 * After Android/PWA resume: repair missing browser subscriptions, VAPID rotation, and server drift.
 */
export async function repairPushSubscriptionIfNeeded(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    pushClientLog("repair-skip", { reason: "not-supported" });
    return null;
  }

  const permission = getNotificationPermission();
  pushClientLog("repair-start", { permission, ...pushRuntimeContext() });

  if (permission === "denied") {
    clearStoredVapidSuffix();
    return null;
  }

  if (permission !== "granted") {
    return syncPushSubscriptionWithServer();
  }

  let publicKey: string;
  try {
    publicKey = await fetchVapidPublicKey();
  } catch (e) {
    pushClientLog("repair-vapid-fetch-failed", {
      message: e instanceof Error ? e.message : String(e),
    });
    return getCurrentSubscription();
  }

  const storedSuffix = getStoredVapidSuffix();
  let sub = await getCurrentSubscription();

  if (sub && vapidSuffixMismatch(storedSuffix, publicKey)) {
    pushClientLog("repair-vapid-mismatch", { storedSuffix, currentSuffix: publicKey.slice(-8) });
    await unregisterBrowserSubscription(sub);
    sub = null;
  }

  if (!sub) {
    pushClientLog("repair-resubscribe", { reason: "permission-granted-no-browser-sub" });
    try {
      await subscribeToPush();
      sub = await getCurrentSubscription();
    } catch (e) {
      pushClientLog("repair-resubscribe-failed", {
        message: e instanceof Error ? e.message : String(e),
      });
      return null;
    }
  } else {
    try {
      await syncPushSubscriptionWithServer();
    } catch (e) {
      pushClientLog("repair-sync-failed", {
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const serverStatus = await fetchPushServerStatus();
  pushClientLog("repair-done", {
    hasBrowserSubscription: !!sub,
    hasServerSubscription: serverStatus?.hasServerSubscription ?? null,
    serverCount: serverStatus?.subscriptionCount ?? null,
    vapidEndsWith: serverStatus?.vapidPublicKeyEndsWith ?? null,
  });

  return sub;
}

/**
 * Disable push: remove server registration, browser subscription, and stored VAPID fingerprint.
 */
export async function disablePushNotifications(): Promise<void> {
  const sub = await getCurrentSubscription();
  if (sub) {
    await unsubscribeFromPush(sub.endpoint);
    await sub.unsubscribe();
  }
  clearStoredVapidSuffix();
  pushClientLog("disabled", { hadBrowserSubscription: !!sub });
}
