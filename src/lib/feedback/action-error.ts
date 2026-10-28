"use client";

import { toast } from "sonner";
import { showReportableError } from "./report-error";

/**
 * Shows the right toast for a failed server action.
 *
 * A plain error toast for validation, and the "Tell us" affordance only when
 * the wrapper marked the failure `reportable` — i.e. it came from an exception,
 * not from a rule the person broke. Call sites do not have to decide; the
 * server already did.
 */
export function toastActionFailure(
  result: { error: string; reportable?: true },
  context: { attemptedAction?: string } = {}
): void {
  if (result.reportable) {
    showReportableError(result.error, context);
    return;
  }
  toast.error(result.error);
}
