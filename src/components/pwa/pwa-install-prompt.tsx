"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const DISMISS_STORAGE_KEY = "pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const alreadyDismissed = localStorage.getItem(DISMISS_STORAGE_KEY) === "1";
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    if (standalone || alreadyDismissed) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setDismissed(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_STORAGE_KEY, "1");
  };

  if (isStandalone || dismissed || !deferredPrompt) return null;

  return (
    <div
      role="region"
      aria-label="Install app"
      className="fixed bottom-20 left-4 right-4 z-40 md:bottom-4 md:left-auto md:right-4 md:max-w-sm rounded-lg border border-border bg-background p-3 shadow-lg"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Install HomeFinance for quick access.
        </p>
        <div className="flex shrink-0 gap-1">
          <Button size="sm" variant="outline" onClick={handleDismiss}>
            Not now
          </Button>
          <Button size="sm" onClick={handleInstall}>
            Install
          </Button>
        </div>
      </div>
    </div>
  );
}
