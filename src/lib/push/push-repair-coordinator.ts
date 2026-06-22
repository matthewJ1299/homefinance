import { repairPushSubscriptionIfNeeded } from "@/lib/push/client";
import { pushClientLog } from "@/lib/push/push-log";
import { isAndroidPwa } from "@/lib/utils/device-detection";

let repairInFlight: Promise<PushSubscription | null> | null = null;
const scheduledTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Delay after resume on Android PWA so the active service worker is ready. */
const ANDROID_PWA_REPAIR_DELAY_MS = 450;

/**
 * Debounced push repair for Android PWA resume, SW updates, and Settings.
 * Multiple triggers collapse into one in-flight repair.
 */
export function schedulePushRepair(trigger: string, delayMs?: number): void {
  const delay = delayMs ?? (isAndroidPwa() ? ANDROID_PWA_REPAIR_DELAY_MS : 0);
  const key = `${trigger}:${delay}`;

  const existing = scheduledTimers.get(key);
  if (existing) clearTimeout(existing);

  pushClientLog("repair-scheduled", { trigger, delayMs: delay, androidPwa: isAndroidPwa() });

  const timer = setTimeout(() => {
    scheduledTimers.delete(key);
    void runPushRepair(trigger);
  }, delay);
  scheduledTimers.set(key, timer);
}

export async function runPushRepair(trigger: string): Promise<PushSubscription | null> {
  if (repairInFlight) {
    pushClientLog("repair-coalesced", { trigger });
    return repairInFlight;
  }

  pushClientLog("repair-running", { trigger, androidPwa: isAndroidPwa() });
  repairInFlight = repairPushSubscriptionIfNeeded().finally(() => {
    repairInFlight = null;
  });
  return repairInFlight;
}
