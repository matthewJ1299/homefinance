# Calendar feature

## Overview

The calendar supports **household-shared** events and **personal** events. Shared events are visible to every signed-in user; personal events are visible only to the user who created them. The creator is always stored for display and for notifications.

**Related**: Budget **expense categories** (`categories` table) are separate from **calendar categories** (`calendar_categories`). Calendar categories only drive color and grouping on the calendar UI. If you later want one list for both, introduce a mapping or unify tables behind a shared interface.

## Data model

### `calendar_categories`

- **Migration**: `drizzle/0009_calendar_categories_and_event_fields_pg.sql` (Postgres). Seeded with defaults: Work, Personal, Family, Health, Other (name + color + sort order).
- **Fields**: `id`, `name` (unique), `color` (hex), `sort_order`.

### `calendar_events`

- **Base migration**: `drizzle/0003_calendar_events_pg.sql` plus `0006_calendar_reminders_pg.sql` (`reminder_minutes`).
- **Extensions (0009)**: `end_time` (optional, HH:mm), `category_id` (FK to `calendar_categories`, ON DELETE SET NULL), `is_shared` (boolean, default `true`), `priority` (integer 1-4, default `2` = Normal).
- **0010**: `end_date` (optional yyyy-MM-dd, inclusive). When set after `date`, the event is a **multi-day span**. The API returns one occurrence per expanded segment with `date` = span start and `endDate` = span end (or `null` for a single day).
- **Other fields**: `created_by_user_id`, `name`, `location`, `date` (yyyy-MM-dd), `time` (optional HH:mm), `notes`, `recurrence_type`, `recurrence_day_of_month`, `created_at`, `reminder_minutes`.

## Recurrence

Events are stored as a single row (template). Recurrence is expanded in the service layer when fetching for a date range:

- **none**: One segment per row if the span `[date, COALESCE(end_date, date)]` overlaps the requested range.
- **weekly**: Same weekday as the event date, every week within the range.
- **monthly**: For each month in the range, the occurrence is on `recurrence_day_of_month` (or the event’s day if null), clamped to the last day of the month.
- **yearly**: Same month and day as the event date, for each year in the range.

Expansion is implemented in `src/lib/utils/recurrence.ts` and used by `CalendarService.getByDateRange()` and `getAllOccurrencesInRange()`.

## API

- **GET /api/calendar/events?start=&end=**  
  Returns expanded occurrences for the signed-in user’s **visible** events in the range (max 1 year): shared + personal where `created_by_user_id` matches. Each occurrence includes `eventId`, `date`, `endDate` (inclusive end for multi-day spans, else `null`), `time`, `endTime`, `name`, `location`, `notes`, `createdByUserId`, `createdByName`, `recurrenceType`, `reminderMinutes`, `categoryId`, `categoryName`, `categoryColor`, `isShared`, `priority`.

- **GET /api/calendar/categories**  
  Lists all calendar categories (id, name, color, sortOrder) for pickers.

- **POST /api/calendar/events**  
  Create event (body: name, location?, date, endDate? [non-recurring only], time?, endTime?, notes?, recurrenceType, recurrenceDayOfMonth?, reminderMinutes?, categoryId?, isShared?, priority?). Sets `created_by_user_id` from session.

- **GET /api/calendar/events/[id]**  
  Fetch a single event (template) by id for editing.

- **PUT /api/calendar/events/[id]**  
  Update event (partial body).

- **DELETE /api/calendar/events/[id]**  
  Delete event.

All routes require an authenticated session (401 if not).

## Permissions

Any authenticated user can create, update, or delete **any** calendar event row (household trust model). Visibility is enforced on **read** paths (list API, dashboard, notifications): personal events are omitted for other users. To restrict **writes** to the creator only, add checks in PUT/DELETE handlers and hide edit UI for non-owners.

## Notifications

- **Daily summary**: Each user receives their own list of **visible** events for today (shared + their personal).
- **Per-event reminders**: Uses `getAllOccurrencesInRange` (no visibility filter). **Shared** events: push to all subscribers; **personal** events: push only to the creator’s subscriptions.
- **Real-time “X added an event”**: Sent to the partner only when the new event is **shared** (`isShared` true).

## UI

- **Route**: `/calendar`
- **Components**: `CalendarClientCustom` (month grid + day schedule + FAB), `MonthGrid`, `DaySchedule`, `EventFormDialog` (create/edit with category, end time, shared flag, priority). Legacy `CalendarClient` (react-big-calendar) remains in the repo but is not the default page entry.
- **Mobile layout**: Month header uses centered **MMMM yyyy** with chevron controls. The grid uses compact **rounded-xl / rounded-2xl** borderless day cells (full-width within each column), transparent default (light hover tint), and tighter vertical spacing between week rows; muted out-of-month days; the **active day** is indicated by the filled primary circle on the number (today uses primary text when not selected). Category-colored **dots** for single-day events; **spanning pills** under each week row for multi-day events (same column gap as the day cells), without an extra ring or border around the bar. The schedule list uses timeline-style rows (time column, vertical color bar, card with separated title / notes / location) and a compact **date range** label when `endDate` is set.
- **Navigation**: Calendar link in the bottom bar (mobile) and sidebar (desktop).

**Related**: **Add** flow for new events lives on `/add` (center bottom-nav control on mobile) and still uses `EventFormDialog` for the event form.

## Implementation notes

- Repository: `ICalendarEventRepository` in `src/lib/repositories/interfaces/calendar-event.repository.ts`; implementation in `src/lib/repositories/sql/calendar-event.repository.ts`.
- Categories: `ICalendarCategoryRepository` + `CalendarCategoryRepository`.
- Service: `CalendarService` in `src/lib/services/calendar.service.ts` (expands spans and recurrence; pads the range start when loading so recurring anchors whose tail overlaps the month are included).
- Client-safe date helpers: `occurrenceCoversDate` / `occurrenceSegmentEnd` in `src/lib/utils/calendar-occurrence.ts` (avoid importing the service module from client components).
- Validators: `src/lib/validators/calendar-event.schema.ts` (Zod).
