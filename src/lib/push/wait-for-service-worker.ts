import { pushClientLog } from "@/lib/push/push-log";
import { isAndroidPwa } from "@/lib/utils/device-detection";

const DEFAULT_TIMEOUT_MS = 8000;
const POLL_INTERVAL_MS = 150;

/**
 * Android PWAs often resume before the active service worker is ready; pushManager
 * then returns no subscription until the registration stabilizes.
 */
export async function waitForPushServiceWorkerRegistration(
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<ServiceWorkerRegistration> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    throw new Error("Service workers are not available");
  }

  const existing = await navigator.serviceWorker.getRegistration();
  if (existing?.active) {
    return existing;
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.active) {
      if (isAndroidPwa()) {
        pushClientLog("sw-ready", { scope: reg.scope, hadToWait: true });
      }
      return reg;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  pushClientLog("sw-ready-timeout", { timeoutMs, androidPwa: isAndroidPwa() });
  return navigator.serviceWorker.ready;
}
