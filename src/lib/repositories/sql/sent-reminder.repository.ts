import { get, run } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import type { ISentReminderRepository } from "../interfaces/sent-reminder.repository";

/**
 * `sent_reminders` has no `household_id` of its own; it is isolated by joining
 * `calendar_events`. Both methods therefore scope through the parent event so a
 * scheduler bound to one household can never read or write another's rows.
 */
export class SentReminderRepository implements ISentReminderRepository {
  async hasBeenSent(
    eventId: number,
    occurrenceDate: string,
    reminderId: number | null
  ): Promise<boolean> {
    const hid = requireHouseholdId();
    const row = await get<{ n: number }>(
      `SELECT 1 AS n FROM sent_reminders sr
       INNER JOIN calendar_events ce ON sr.event_id = ce.id
       WHERE sr.event_id = ?
         AND sr.occurrence_date = ?
         AND sr.reminder_id IS NOT DISTINCT FROM ?
         AND ce.household_id = ?`,
      [eventId, occurrenceDate, reminderId, hid]
    );
    return !!row;
  }

  async markSent(
    eventId: number,
    occurrenceDate: string,
    reminderId: number | null
  ): Promise<void> {
    const hid = requireHouseholdId();
    // INSERT ... SELECT FROM calendar_events so the household predicate makes this a
    // no-op for an event in another tenant. NOT EXISTS keeps it idempotent, matching
    // the "send at most once per event/occurrence/reminder" contract.
    await run(
      `INSERT INTO sent_reminders (event_id, occurrence_date, reminder_id)
       SELECT ce.id, ?, ?
       FROM calendar_events ce
       WHERE ce.id = ? AND ce.household_id = ?
         AND NOT EXISTS (
           SELECT 1 FROM sent_reminders
           WHERE event_id = ? AND occurrence_date = ? AND reminder_id IS NOT DISTINCT FROM ?
         )`,
      [occurrenceDate, reminderId, eventId, hid, eventId, occurrenceDate, reminderId]
    );
  }
}
