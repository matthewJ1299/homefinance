"use client";

import { toast } from "sonner";

/**
 * Bridge between error paths and the feedback form.
 *
 * Errors surface from places that cannot use a hook — a class error boundary's
 * `componentDidCatch`, a `window` listener, a callback deep in a mutation — so
 * the provider registers its opener here on mount and those paths call through
 * it. A module-level slot rather than context, for exactly that reason.
 */

type Opener = (prefill: { attemptedAction?: string; errorMessage?: string }) => void;

let opener: Opener | null = null;

export function registerFeedbackOpener(fn: Opener | null): void {
  opener = fn;
}

/** Recently shown messages, so one failing render does not stack ten toasts. */
const recent = new Map<string, number>();
const DEDUPE_MS = 5_000;

function seenRecently(key: string): boolean {
  const now = Date.now();
  for (const [k, at] of recent) {
    if (now - at > DEDUPE_MS) recent.delete(k);
  }
  if (recent.has(key)) return true;
  recent.set(key, now);
  return false;
}

/**
 * Shows an error toast with a "Tell us" affordance.
 *
 * Reserved for genuine failures — a crash, or a server error that got as far as
 * the generic "something went wrong". Validation messages ("Pick a day between
 * 1 and 28") are the app working correctly, and offering to report those trains
 * people to ignore the prompt.
 */
export function showReportableError(
  message: string,
  context: { attemptedAction?: string } = {}
): void {
  if (seenRecently(`${context.attemptedAction ?? ""}|${message}`)) return;

  // Deferred a task, for two reasons that both bite on the error-boundary path.
  //
  // Sonner does not replay toasts published before its <Toaster> subscribes, and
  // an error caught during hydration fires `componentDidCatch` in the same
  // commit that mounts it -- so the toast was created and silently dropped.
  // Publishing after the current task also keeps this out of React's commit
  // phase, where triggering an external store update is a bad idea regardless.
  setTimeout(() => {
    toast.error(message, {
      duration: 10_000,
      action: {
        label: "Tell us",
        onClick: () =>
          opener?.({ attemptedAction: context.attemptedAction, errorMessage: message }),
      },
    });
  }, 0);
}
