"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
} from "@/lib/push/client";
import { Button } from "@/components/ui/button";

export function PushNotificationsSettings() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const updateState = useCallback(async () => {
    setSupported(isPushSupported());
    setPermission(getNotificationPermission());
    const sub = await getCurrentSubscription();
    setSubscribed(!!sub);
  }, []);

  useEffect(() => {
    updateState();
  }, [updateState]);

  const handleEnable = async () => {
    setMessage(null);
    setLoading(true);
    try {
      await subscribeToPush();
      setPermission("granted");
      setSubscribed(true);
      setMessage({ type: "success", text: "Notifications enabled." });
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to enable notifications",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setMessage(null);
    setLoading(true);
    try {
      const sub = await getCurrentSubscription();
      if (sub) {
        await unsubscribeFromPush(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setMessage({ type: "success", text: "Notifications disabled." });
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to disable",
      });
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
        setMessage({ type: "error", text: data.error ?? "Failed to send test" });
        return;
      }
      setMessage({ type: "success", text: "Test notification sent." });
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to send test",
      });
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
        <p
          className={`text-sm mb-3 ${message.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
        >
          {message.text}
        </p>
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
    </section>
  );
}
