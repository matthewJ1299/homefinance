export interface ISentReminderRepository {
  hasBeenSent(
    eventId: number,
    occurrenceDate: string,
    reminderId: number | null
  ): Promise<boolean>;
  markSent(
    eventId: number,
    occurrenceDate: string,
    reminderId: number | null
  ): Promise<void>;
}
