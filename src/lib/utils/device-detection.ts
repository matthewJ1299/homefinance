/**
 * Device and browser detection for PWA install prompt.
 * Used to show iOS Safari-specific install instructions (no beforeinstallprompt on iOS).
 */

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const platform = (navigator as unknown as { platform?: string }).platform;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

/** True when running in Safari on iOS (not Chrome/Firefox on iOS). Used to show delayed install instructions. */
export function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const ios = isIOS();
  const safari =
    ua.includes("safari") &&
    !ua.includes("chrome") &&
    !ua.includes("crios") &&
    !ua.includes("fxios");
  return ios && safari;
}
