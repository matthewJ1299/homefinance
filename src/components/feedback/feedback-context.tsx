"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { registerFeedbackOpener, showReportableError } from "@/lib/feedback/report-error";
import { FeedbackDialog } from "./feedback-dialog";

/**
 * What the form opens with. Empty when raised from the menu; filled in when
 * raised from a failure, which is the whole reason the error path exists —
 * asking someone to remember what they just did is how you get "it broke".
 */
export interface FeedbackPrefill {
  /** What they were trying to do, e.g. "Save spend". */
  attemptedAction?: string;
  /** The failure text, shown read-only so they know what we already captured. */
  errorMessage?: string;
}

interface FeedbackContextValue {
  open: (prefill?: FeedbackPrefill) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

/**
 * Holds the feedback form for the whole shell, so the menu item and an error
 * toast open the same one rather than each carrying a copy.
 */
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefill, setPrefill] = useState<FeedbackPrefill>({});

  const open = useCallback((next?: FeedbackPrefill) => {
    setPrefill(next ?? {});
    setIsOpen(true);
  }, []);

  const value = useMemo(() => ({ open }), [open]);

  // Error paths that cannot reach React context — the class error boundaries and
  // the window listeners below — open the form through this slot.
  useEffect(() => {
    registerFeedbackOpener(open);
    return () => registerFeedbackOpener(null);
  }, [open]);

  // Uncaught async failures never reach an error boundary: a rejected promise in
  // an event handler leaves the UI looking fine while nothing happened. Listened
  // for, never suppressed -- no preventDefault, so the console and the dev
  // overlay still see everything they would have.
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason ?? "");
      if (!message) return;
      showReportableError("Something went wrong. Nothing was saved.", {
        attemptedAction: message.slice(0, 200),
      });
    };
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, []);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <FeedbackDialog open={isOpen} onOpenChange={setIsOpen} prefill={prefill} />
    </FeedbackContext.Provider>
  );
}

/** Null outside the shell — callers fall back to doing nothing. */
export function useFeedback(): FeedbackContextValue | null {
  return useContext(FeedbackContext);
}
