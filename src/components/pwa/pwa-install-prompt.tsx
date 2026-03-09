"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { isIOSSafari, isStandalone } from "@/lib/utils/device-detection";

const SESSION_DISMISS_KEY = "pwa-prompt-dismissed";
const INSTALLED_KEY = "pwa-installed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const IOS_PROMPT_DELAY_MS = 3000;

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const isIOS = isIOSSafari();

  useEffect(() => {
    if (isStandalone()) {
      setIsInstalled(true);
      return;
    }
    if (typeof window !== "undefined" && localStorage.getItem(INSTALLED_KEY) === "true") {
      setIsInstalled(true);
      return;
    }

    if (isIOS) {
      const timer = setTimeout(() => {
        if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_DISMISS_KEY) !== "true") {
          setShowPrompt(true);
        }
      }, IOS_PROMPT_DELAY_MS);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isIOS]);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIosInstructions(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(INSTALLED_KEY, "true");
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIosInstructions(false);
    sessionStorage.setItem(SESSION_DISMISS_KEY, "true");
  };

  if (isInstalled || !showPrompt || (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_DISMISS_KEY) === "true")) {
    return null;
  }

  const containerClass =
    "fixed bottom-20 left-4 right-4 z-40 md:bottom-4 md:left-auto md:right-4 md:max-w-sm rounded-lg border border-border bg-background p-3 shadow-lg";

  return (
    <div
      role="region"
      aria-label={showIosInstructions ? "Install app on iOS" : "Install app"}
      className={containerClass}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Install HomeFinance for quick access and offline use.
          </p>
          <div className="flex shrink-0 gap-1">
            {!showIosInstructions && (
              <Button size="sm" variant="outline" onClick={handleInstall}>
                {isIOS ? "How to Install" : "Install"}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              {showIosInstructions ? "Close" : "Not now"}
            </Button>
          </div>
        </div>
        {showIosInstructions && (
          <div className="mt-1.5 border-l-2 border-primary pl-3">
            <p className="text-sm font-medium mb-1">To install on iOS:</p>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-0.5 m-0 pl-0">
              <li>Tap the Share button (square with arrow) at the bottom of Safari</li>
              <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
              <li>Tap &quot;Add&quot; to confirm</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
