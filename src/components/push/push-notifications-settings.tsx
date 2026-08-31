"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  disablePushNotifications,
} from "@/lib/push/client";
import { pushClientLog } from "@/lib/push/push-log";
import { runPushRepair } from "@/lib/push/push-repair-coordinator";
import { isAndroidPwa } from "@/lib/utils/device-detection";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function PushNotificationsSettings() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
    keyFingerprints?: { publicKeyStartsWith: string; publicKeyEndsWith: string; privateKeyStartsWith: string };
  } | null>(null);
  const lastSubscribedRef = useRef<boolean | null>(null);

  const updateState = useCallback(async (trigger: string) => {
    const pushSupported = isPushSupported();
    setSupported(pushSupported);
    const perm = getNotificationPermission();
    setPermission(perm);

    pushClientLog("settings-refresh", { trigger, pushSupported, permission: perm });

    if (!pushSupported) {
      setSubscribed(false);
      return;
    }

    const sub = await runPushRepair(`settings-${trigger}`);
    const nextSubscribed = !!sub;
    if (lastSubscribedRef.current !== null && lastSubscribedRef.current !== nextSubscribed) {
      pushClientLog("settings-subscribed-changed", {
        trigger,
        from: lastSubscribedRef.current,
        to: nextSubscribed,
        permission: perm,
      });
    }
    lastSubscribedRef.current = nextSubscribed;
    setSubscribed(nextSubscribed);
  }, []);

  useEffect(() => {
    void updateState("mount");
  }, [updateState]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void updateState("visibility");
      }
    };
    const onFocus = () => {
      void updateState("focus");
    };
    const onPageShow = () => {
      void updateState("pageshow");
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [updateState]);

  const handleEnable = async () => {
    setMessage(null);
    setLoading(true);
    try {
      await subscribeToPush();
      setPermission("granted");
      setSubscribed(true);
      lastSubscribedRef.current = true;
      pushClientLog("settings-enable-success", {});
      setMessage({ type: "success", text: "Notifications enabled." });
      toast.success("Notifications enabled.");
    } catch (e) {
      const text = e instanceof Error ? e.message : "Failed to enable notifications.";
      pushClientLog("settings-enable-failed", { message: text });
      toast.error(text);
      setMessage({ type: "error", text });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setMessage(null);
    setLoading(true);
    try {
      await disablePushNotifications();
      setSubscribed(false);
      lastSubscribedRef.current = false;
      pushClientLog("settings-disable-success", {});
      setMessage({ type: "success", text: "Notifications disabled." });
      toast.success("Notifications disabled.");
    } catch (e) {
      const text = e instanceof Error ? e.message : "Failed to disable notifications.";
      pushClientLog("settings-disable-failed", { message: text });
      toast.error(text);
      setMessage({ type: "error", text });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "HomeFinance",
          body: "This is a test notification.",
          url: "/dashboard",
        }),
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        pushClientLog("settings-test-failed", { status: res.status, error: data.error });
        toast.error(data.error ?? "Failed to send test notification.");
        setMessage({
          type: "error",
          text: data.error ?? "Failed to send test",
          keyFingerprints: data.keyFingerprints,
        });
        return;
      }
      pushClientLog("settings-test-success", { sent: data.sent, failed: data.failed });
      setMessage({ type: "success", text: "Test notification sent." });
      toast.success("Test notification sent.");
    } catch (e) {
      const text = e instanceof Error ? e.message : "Failed to send test notification.";
      pushClientLog("settings-test-error", { message: text });
      toast.error(text);
      setMessage({ type: "error", text });
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <section className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium mb-1">Push notifications</h2>
        <p className="text-sm text-muted-foreground">
          Not supported in this browser. Use HTTPS and a browser that supports Web Push (e.g. Chrome, Edge, Firefox).
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="text-sm font-medium mb-1">Push notifications</h2>
      <p className="text-xs text-muted-foreground mb-3">
        Receive notifications from HomeFinance when the app is open in the background or closed.
      </p>

      {message && (
        <div className="mb-3 space-y-1">
          <p
            className={`text-sm ${message.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
          >
            {message.text}
          </p>
          {message.keyFingerprints && (
            <p className="text-xs text-muted-foreground">
              Server VAPID public key starts with: {message.keyFingerprints.publicKeyStartsWith}..., ends with: ...
              {message.keyFingerprints.publicKeyEndsWith}. Private key starts with:{" "}
              {message.keyFingerprints.privateKeyStartsWith}...
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!subscribed && (
          <Button
            type="button"
            variant="default"
            onClick={handleEnable}
            disabled={loading}
          >
            {loading ? "Enabling..." : "Enable notifications"}
          </Button>
        )}
        {subscribed && (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSendTest}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send test"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDisable}
              disabled={loading}
            >
              Disable notifications
            </Button>
          </>
        )}
      </div>

      {permission === "denied" && (
        <p className="text-xs text-muted-foreground mt-2">
          Notifications were blocked. Allow them in your browser settings for this site, then try again.
        </p>
      )}

      {isAndroidPwa() && permission === "granted" && !subscribed && (
        <p className="text-xs text-muted-foreground mt-2">
          On Android, the installed app can lose its push registration after an update or when the app was
          closed for a while. Tap Enable notifications once; the app will also try to restore it when you
          reopen HomeFinance.
        </p>
      )}
    </section>
  );
}
