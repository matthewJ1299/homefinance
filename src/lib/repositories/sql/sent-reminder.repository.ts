import { get, run } from "@/lib/db";
import type { ISentReminderRepository } from "../interfaces/sent-reminder.repository";

export class SentReminderRepository implements ISentReminderRepository {
  async hasBeenSent(
    eventId: number,
    occurrenceDate: string,
    reminderId: number | null
  ): Promise<boolean> {
    const row = await get<{ n: number }>(
      `SELECT 1 AS n FROM sent_reminders
       WHERE event_id = ? AND occurrence_date = ? AND reminder_id IS NOT DISTINCT FROM ?`,
      [eventId, occurrenceDate, reminderId]
    );
    return !!row;
  }

  async markSent(
    eventId: number,
    occurrenceDate: string,
    reminderId: number | null
  ): Promise<void> {
    await run(
      `INSERT INTO sent_reminders (event_id, occurrence_date, reminder_id)
       SELECT ?, ?, ?
       WHERE NOT EXISTS (
         SELECT 1 FROM sent_reminders
         WHERE event_id = ? AND occurrence_date = ? AND reminder_id IS NOT DISTINCT FROM ?
       )`,
      [eventId, occurrenceDate, reminderId, eventId, occurrenceDate, reminderId]
    );
  }
}
