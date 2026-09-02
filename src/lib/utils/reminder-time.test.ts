import { describe, it, expect } from "vitest";
import { computeReminderInstant, REMINDER_LOOKAHEAD_DAYS, REMINDER_MAX_OFFSET_MINUTES } from "./reminder-time";

describe("computeReminderInstant", () => {
  it("sub-day offset with an event time subtracts minutes", () => {
    expect(
      computeReminderInstant({
        eventDate: "2026-08-31",
        eventTime: "14:00",
        offsetMinutes: 30,
        sendTime: null,
      })
    ).toEqual({ date: "2026-08-31", time: "13:30" });
  });

  it("sub-day offset can cross midnight to the previous day", () => {
    expect(
      computeReminderInstant({
        eventDate: "2026-08-31",
        eventTime: "00:10",
        offsetMinutes: 30,
        sendTime: null,
      })
    ).toEqual({ date: "2026-08-30", time: "23:40" });
  });

  it("sub-day offset with no event time returns null", () => {
    expect(
      computeReminderInstant({
        eventDate: "2026-08-31",
        eventTime: null,
        offsetMinutes: 10,
        sendTime: null,
      })
    ).toBeNull();
  });

  it("day offset with sendTime shifts back whole days at the chosen time", () => {
    expect(
      computeReminderInstant({
        eventDate: "2026-08-31",
        eventTime: "14:00",
        offsetMinutes: 10080, // 1 week
        sendTime: "09:00",
      })
    ).toEqual({ date: "2026-08-24", time: "09:00" });
  });

  it("day offset with sendTime works for an all-day event (no event time)", () => {
    expect(
      computeReminderInstant({
        eventDate: "2026-08-31",
        eventTime: null,
        offsetMinutes: 20160, // 2 weeks
        sendTime: "08:30",
      })
    ).toEqual({ date: "2026-08-17", time: "08:30" });
  });

  it("offset of exactly 1440 with sendTime is one day back", () => {
    expect(
      computeReminderInstant({
        eventDate: "2026-03-02",
        eventTime: "12:00",
        offsetMinutes: 1440,
        sendTime: "07:15",
      })
    ).toEqual({ date: "2026-03-01", time: "07:15" });
  });

  it("lookahead window covers the largest supported offset", () => {
    expect(REMINDER_LOOKAHEAD_DAYS).toBeGreaterThanOrEqual(
      Math.floor(REMINDER_MAX_OFFSET_MINUTES / 1440)
    );
  });
});
