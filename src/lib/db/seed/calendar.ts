import { addDays, format } from "date-fns";
import { all, lastInsertId, run } from "../index";
import type { SeedContext } from "./types";

export async function seedCalendar(ctx: SeedContext): Promise<void> {
  const { householdId, mattId, sydneyId } = ctx;

  const categories = await all<{ id: number; name: string }>(
    "SELECT id, name FROM calendar_categories WHERE household_id = ? ORDER BY sort_order",
    [householdId]
  );
  const byName = Object.fromEntries(categories.map((c) => [c.name, c.id]));
  const today = new Date();

  const events: Array<{
    creatorId: number;
    name: string;
    location: string | null;
    date: string;
    time: string | null;
    endTime: string | null;
    categoryName: string;
    isShared: boolean;
    priority: number;
    recurrenceType: string;
    notes: string | null;
    reminders: Array<{ offsetMinutes: number; sendTime: string | null }>;
  }> = [
    {
      creatorId: mattId,
      name: "Budget review",
      location: "Home office",
      date: format(addDays(today, 2), "yyyy-MM-dd"),
      time: "19:00",
      endTime: "20:00",
      categoryName: "Personal",
      isShared: true,
      priority: 2,
      recurrenceType: "none",
      notes: "Review month-end spending together.",
      reminders: [
        { offsetMinutes: 1440, sendTime: "18:00" },
        { offsetMinutes: 60, sendTime: null },
      ],
    },
    {
      creatorId: sydneyId,
      name: "Medical check-up",
      location: "City clinic",
      date: format(addDays(today, 5), "yyyy-MM-dd"),
      time: "09:30",
      endTime: "10:30",
      categoryName: "Health",
      isShared: false,
      priority: 1,
      recurrenceType: "none",
      notes: null,
      reminders: [{ offsetMinutes: 2880, sendTime: "08:00" }],
    },
    {
      creatorId: mattId,
      name: "Family braai",
      location: "Backyard",
      date: format(addDays(today, 9), "yyyy-MM-dd"),
      time: "12:00",
      endTime: "16:00",
      categoryName: "Family",
      isShared: true,
      priority: 2,
      recurrenceType: "none",
      notes: "Invite neighbours.",
      reminders: [
        { offsetMinutes: 10080, sendTime: "10:00" },
        { offsetMinutes: 120, sendTime: null },
      ],
    },
    {
      creatorId: sydneyId,
      name: "Sprint planning",
      location: "Office",
      date: format(addDays(today, 1), "yyyy-MM-dd"),
      time: "10:00",
      endTime: "11:30",
      categoryName: "Work",
      isShared: false,
      priority: 2,
      recurrenceType: "none",
      notes: null,
      reminders: [{ offsetMinutes: 15, sendTime: null }],
    },
  ];

  for (const event of events) {
    const categoryId = byName[event.categoryName] ?? null;
    await run(
      `INSERT INTO calendar_events (created_by_user_id, household_id, name, location, date, time, end_time,
        category_id, is_shared, priority, recurrence_type, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.creatorId,
        householdId,
        event.name,
        event.location,
        event.date,
        event.time,
        event.endTime,
        categoryId,
        event.isShared,
        event.priority,
        event.recurrenceType,
        event.notes,
      ]
    );
    const eventId = await lastInsertId();

    for (const reminder of event.reminders) {
      await run(
        "INSERT INTO calendar_event_reminders (event_id, offset_minutes, send_time) VALUES (?, ?, ?)",
        [eventId, reminder.offsetMinutes, reminder.sendTime]
      );
    }
  }

  console.log(`Created ${events.length} calendar events with reminders.`);
}
