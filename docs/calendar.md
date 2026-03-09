# Calendar feature

## Overview

The calendar is a shared household calendar: all authenticated users see the same events and can create, edit, and delete any event. There is no per-user filtering; the creator is stored only for display ("Created by X").

## Data model

- **Table**: `calendar_events`
- **Fields**: id, created_by_user_id, name, location, date (yyyy-MM-dd), time (optional, HH:mm), notes, recurrence_type (none | weekly | monthly | yearly), recurrence_day_of_month (optional, 1-31 for monthly), created_at
- **Migration**: `drizzle/0003_calendar_events_pg.sql` (Postgres) and `0003_calendar_events.sql` (SQLite). Applied by `npm run db:push` when the table is missing.

## Recurrence

Events are stored as a single row (template). Recurrence is expanded in the service layer when fetching for a date range:

- **none**: One occurrence on the event date if it falls within the range.
- **weekly**: Same weekday as the event date, every week within the range.
- **monthly**: For each month in the range, the occurrence is on `recurrence_day_of_month` (or the event's day if null), clamped to the last day of the month.
- **yearly**: Same month and day as the event date, for each year in the range.

Expansion is implemented in `src/lib/utils/recurrence.ts` and used by `CalendarService.getByDateRange()`.

## API

- **GET /api/calendar/events?start=&end=**  
  Returns expanded occurrences for the date range (max 1 year). Each occurrence includes eventId, date, time, name, location, notes, createdByUserId, createdByName, recurrenceType.
- **POST /api/calendar/events**  
  Create event (body: name, location?, date, time?, notes?, recurrenceType, recurrenceDayOfMonth?). Sets created_by_user_id from session.
- **GET /api/calendar/events/[id]**  
  Fetch a single event (template) by id for editing.
- **PUT /api/calendar/events/[id]**  
  Update event (partial body).
- **DELETE /api/calendar/events/[id]**  
  Delete event.

All routes require an authenticated session (401 if not).

## Permissions

Any authenticated user can create, update, and delete any calendar event. This is intentional for a shared household calendar. To restrict edits to the creator, add an ownership check in the PUT and DELETE handlers and in the UI.

## UI

- **Route**: `/calendar`
- **Components**: `CalendarClient` (react-big-calendar with date-fns localizer), `EventFormDialog` (create/edit form with recurrence options).
- **Navigation**: Calendar link and icon in the app nav (nav-items.ts).
- **Flow**: Month/week/day views; click a slot to create an event for that date/time; click an event to edit or delete. Events show the creator name in the title.

## Related

- Repository: `ICalendarEventRepository` in `src/lib/repositories/interfaces/calendar-event.repository.ts`; implementation in `src/lib/repositories/sqlite/calendar-event.repository.ts` (used for both Postgres and SQLite via the shared DB abstraction).
- Service: `CalendarService` in `src/lib/services/calendar.service.ts`.
- Validators: `src/lib/validators/calendar-event.schema.ts` (Zod).
