"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { showReportableError } from "@/lib/feedback/report-error";

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * What to show instead of the crashed subtree.
   *
   * Defaults to nothing. For a piece of chrome — a nav widget, an indicator —
   * silence is the right fallback: replacing the header with an error card is a
   * worse outcome than the widget simply not being there.
   */
  fallback?: ReactNode;
  /** Named in the console so a report says which part failed. */
  name: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Contains a crash to one part of the screen.
 *
 * Next's `error.tsx` files are boundaries too, but they sit at route-segment
 * level: a client component rendered by the *layout* — the header, the bottom
 * bar, the Add sheet — is above the page segment, so a throw there sails past
 * `(app)/error.tsx` and lands on `global-error.tsx`, replacing the entire app
 * with a full-page failure. One misbehaving widget should not do that.
 *
 * Deliberately a class: `componentDidCatch` has no hook equivalent, and React
 * has no plans to add one.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Logged rather than swallowed: a widget that silently disappears with no
    // trace is harder to diagnose than one that crashes loudly.
    console.error(`[${this.props.name}] crashed and was contained:`, error, info.componentStack);
    // Containing a crash makes it invisible to the person using the app, which
    // is the point -- but they should still be offered the chance to say what
    // they were doing when it happened.
    showReportableError("Part of this screen stopped working.", {
      attemptedAction: `${this.props.name} crashed`,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
