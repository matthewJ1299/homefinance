/** localStorage key for the VAPID public key suffix used when the browser subscription was created. */
export const VAPID_SUFFIX_STORAGE_KEY = "homefinance-push-vapid-suffix";

export function vapidPublicKeySuffix(publicKey: string): string {
  const trimmed = publicKey.trim();
  return trimmed.length >= 8 ? trimmed.slice(-8) : trimmed;
}

export function getStoredVapidSuffix(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(VAPID_SUFFIX_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeVapidSuffix(publicKey: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VAPID_SUFFIX_STORAGE_KEY, vapidPublicKeySuffix(publicKey));
  } catch {
    // private mode / quota
  }
}

export function clearStoredVapidSuffix(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(VAPID_SUFFIX_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function vapidSuffixMismatch(stored: string | null, currentPublicKey: string): boolean {
  if (!stored) return false;
  return stored !== vapidPublicKeySuffix(currentPublicKey);
}
