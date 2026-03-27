import { get, run } from "@/lib/db";
import type { ISentReminderRepository } from "../interfaces/sent-reminder.repository";

export class SentReminderRepository implements ISentReminderRepository {
  async hasBeenSent(eventId: number, occurrenceDate: string): Promise<boolean> {
    const row = await get<{ n: number }>(
      "SELECT 1 AS n FROM sent_reminders WHERE event_id = ? AND occurrence_date = ?",
      [eventId, occurrenceDate]
    );
    return !!row;
  }

  async markSent(eventId: number, occurrenceDate: string): Promise<void> {
    await run(
      "INSERT INTO sent_reminders (event_id, occurrence_date) VALUES (?, ?)",
      [eventId, occurrenceDate]
    );
  }
}
