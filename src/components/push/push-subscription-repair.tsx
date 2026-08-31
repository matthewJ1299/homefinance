"use client";

import { useEffect } from "react";
import { schedulePushRepair } from "@/lib/push/push-repair-coordinator";
import { pushClientLog } from "@/lib/push/push-log";
import { isAndroidPwa } from "@/lib/utils/device-detection";

/**
 * Keeps Web Push subscriptions alive on Android installed PWAs.
 * Repairs after SW updates, app resume, and bfcache restore (common on Pixel).
 */
export function PushSubscriptionRepair() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    pushClientLog("repair-listener-mounted", { androidPwa: isAndroidPwa() });

    const onControllerChange = () => {
      schedulePushRepair("controllerchange", isAndroidPwa() ? 300 : 100);
    };

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string } | null;
      if (data?.type === "PUSH_SW_ACTIVATED") {
        schedulePushRepair("sw-activated", isAndroidPwa() ? 400 : 150);
      }
      if (data?.type === "PUSH_SUBSCRIPTION_CHANGE") {
        schedulePushRepair("pushsubscriptionchange", isAndroidPwa() ? 400 : 150);
      }
    };

    const onPageShow = (event: PageTransitionEvent) => {
      schedulePushRepair(event.persisted ? "pageshow-bfcache" : "pageshow");
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        schedulePushRepair("visibility");
      }
    };

    const onOnline = () => {
      schedulePushRepair("online", isAndroidPwa() ? 500 : 200);
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    navigator.serviceWorker.addEventListener("message", onMessage);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    schedulePushRepair("app-shell-mount");

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      navigator.serviceWorker.removeEventListener("message", onMessage);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
