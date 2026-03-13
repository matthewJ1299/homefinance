export interface ISentReminderRepository {
  hasBeenSent(eventId: number, occurrenceDate: string): Promise<boolean>;
  markSent(eventId: number, occurrenceDate: string): Promise<void>;
}
