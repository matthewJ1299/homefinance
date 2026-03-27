export interface CalendarCategory {
  id: number;
  name: string;
  color: string;
  sortOrder: number;
}

export interface ICalendarCategoryRepository {
  findAll(): Promise<CalendarCategory[]>;
}
