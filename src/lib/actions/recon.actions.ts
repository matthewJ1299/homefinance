"use server";

import { authedAction } from "@/lib/actions/_shared/authed-action";
import { notifyReconSplitsFiled } from "@/lib/services/recon/recon-split-notify";

export type ReconNotifyResult = { success: true } | { success: false; error: string };

/**
 * The one summary push a bulk "Process marked" run deserves.
 *
 * That console files rows one request at a time, so each request is told not
 * to push on its own; the client then calls this once with every expense it
 * filed. The server re-reads those rows and only ever announces expenses the
 * caller created, so the ids are a hint, not a claim.
 */
export async function notifyReconSplitsFiledAction(
  expenseIds: number[]
): Promise<ReconNotifyResult> {
  return authedAction<{ success: true }>(
    async ({ session, userId }) => {
      await notifyReconSplitsFiled({
        userId,
        adderName: session.user.name ?? "Someone",
        expenseIds: Array.isArray(expenseIds) ? expenseIds : [],
      });
      return { success: true };
    },
    { onError: "Could not send the summary notification." }
  );
}
