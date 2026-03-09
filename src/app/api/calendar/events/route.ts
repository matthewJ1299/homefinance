import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CalendarService } from "@/lib/services/calendar.service";
import { createCalendarEventSchema, getCalendarEventsQuerySchema } from "@/lib/validators/calendar-event.schema";
import { differenceInDays, parseISO } from "date-fns";

const MAX_RANGE_DAYS = 366;

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");
  const parsed = getCalendarEventsQuerySchema.safeParse({ start, end });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", issues: parsed.error.issues }, { status: 400 });
  }
  const { start: startStr, end: endStr } = parsed.data;
  const startDate = parseISO(startStr);
  const endDate = parseISO(endStr);
  if (startDate > endDate) {
    return NextResponse.json({ error: "start must be before or equal to end" }, { status: 400 });
  }
  if (differenceInDays(endDate, startDate) > MAX_RANGE_DAYS) {
    return NextResponse.json({ error: "Date range must not exceed 1 year" }, { status: 400 });
  }
  const service = new CalendarService();
  const result = await service.getByDateRange(startStr, endStr);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const parsed = createCalendarEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const userId = Number(session.user.id);
  const service = new CalendarService();
  const { id } = await service.create(userId, parsed.data);
  return NextResponse.json({ id });
}
