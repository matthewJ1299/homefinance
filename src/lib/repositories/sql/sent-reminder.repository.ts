import { get, run } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import type { ISentReminderRepository } from "../interfaces/sent-reminder.repository";

export class SentReminderRepository implements ISentReminderRepository {
  async hasBeenSent(eventId: number, occurrenceDate: string): Promise<boolean> {
    const hid = requireHouseholdId();
    const row = await get<{ n: number }>(
      `SELECT 1 AS n FROM sent_reminders sr
       INNER JOIN calendar_events ce ON sr.event_id = ce.id
       WHERE sr.event_id = ? AND sr.occurrence_date = ? AND ce.household_id = ?`,
      [eventId, occurrenceDate, hid]
    );
    return !!row;
  }

  async markSent(eventId: number, occurrenceDate: string): Promise<void> {
    const hid = requireHouseholdId();
    const ev = await get<{ id: number }>(
      "SELECT id FROM calendar_events WHERE id = ? AND household_id = ? LIMIT 1",
      [eventId, hid]
    );
    if (!ev) {
      return;
    }
    await run("INSERT INTO sent_reminders (event_id, occurrence_date) VALUES (?, ?)", [
      eventId,
      occurrenceDate,
    ]);
  }
}
