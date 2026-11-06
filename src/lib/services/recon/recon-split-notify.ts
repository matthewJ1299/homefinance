import { getExpenseParticipantRepository, getExpenseRepository } from "@/lib/repositories";
import {
  reconSplitsFiledPayload,
  summariseReconSplits,
} from "@/lib/push/recon-split-notification";

/**
 * One push per other person for a batch of recon-filed expenses: how many
 * shared spends they are in, what those came to, and their share.
 *
 * Reads the saved rows rather than trusting figures from the caller, and only
 * expenses the caller created -- `findByIdsForUser` scopes on `user_id` -- so
 * a client cannot have the server announce spends it did not file. A row with
 * no other participant yields no recipient, so a plain (unsplit) filing is
 * silent. Best-effort: the filing has already gone through, and a push that
 * fails must never turn it into an error.
 */
export async function notifyReconSplitsFiled(input: {
  userId: number;
  adderName: string;
  expenseIds: number[];
}): Promise<void> {
  const ids = [...new Set(input.expenseIds.filter((id) => Number.isInteger(id) && id > 0))];
  if (ids.length === 0) return;
  try {
    const { NotificationService, isNotificationConfigured } = await import(
      "@/lib/services/notification.service"
    );
    if (!isNotificationConfigured()) return;

    const expenses = await getExpenseRepository().findByIdsForUser(ids, input.userId);
    if (expenses.length === 0) return;
    const shares = await getExpenseParticipantRepository().findByExpenseIds(
      expenses.map((e) => e.id)
    );
    const summaries = summariseReconSplits(
      input.userId,
      expenses.map((e) => ({ id: e.id, amount: e.amount })),
      shares
    );
    if (summaries.length === 0) return;

    const notificationService = new NotificationService();
    for (const summary of summaries) {
      await notificationService.sendToUser(
        summary.userId,
        reconSplitsFiledPayload({ adderName: input.adderName, summary })
      );
    }
  } catch {
    // Notification failure must not affect the primary operation
  }
}
