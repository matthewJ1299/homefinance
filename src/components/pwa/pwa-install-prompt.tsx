"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const DISMISS_STORAGE_KEY = "pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const platform = (navigator as unknown as { platform?: string }).platform;
  return /iPad|iPhone|iPod/.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
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

    const ios = isIos();
    if (ios) {
      setShowIosInstructions(true);
      setDismissed(false);
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

  const showPrompt = !isStandalone && !dismissed && (deferredPrompt != null || showIosInstructions);
  if (!showPrompt) return null;

  const containerClass =
    "fixed bottom-20 left-4 right-4 z-40 md:bottom-4 md:left-auto md:right-4 md:max-w-sm rounded-lg border border-border bg-background p-3 shadow-lg";

  if (showIosInstructions) {
    return (
      <div role="region" aria-label="Install app on iOS" className={containerClass}>
        <p className="text-sm text-muted-foreground mb-2">
          To install HomeFinance on your iPhone or iPad: tap the <strong>Share</strong> button
          (square with arrow) at the bottom of Safari, then tap <strong>Add to Home Screen</strong>.
        </p>
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={handleDismiss}>
            Not now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div role="region" aria-label="Install app" className={containerClass}>
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
