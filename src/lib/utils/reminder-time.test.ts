import { describe, it, expect } from "vitest";
import {
  computeReminderDueInstant,
  computeReminderInstant,
  eventStartInstant,
  REMINDER_LOOKAHEAD_DAYS,
  REMINDER_MAX_OFFSET_MINUTES,
  shouldSendReminderNow,
} from "./reminder-time";

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

describe("computeReminderDueInstant", () => {
  it("pins a sub-day reminder to a SAST instant (30 min before 14:00 -> 11:30Z)", () => {
    expect(
      computeReminderDueInstant({
        eventDate: "2026-08-31",
        eventTime: "14:00",
        offsetMinutes: 30,
        sendTime: null,
      })?.toISOString()
    ).toBe("2026-08-31T11:30:00.000Z");
  });

  it("is null when it cannot be placed on the clock (sub-day offset, no time)", () => {
    expect(
      computeReminderDueInstant({
        eventDate: "2026-08-31",
        eventTime: null,
        offsetMinutes: 10,
        sendTime: null,
      })
    ).toBeNull();
  });
});

describe("eventStartInstant", () => {
  it("uses the event time in SAST", () => {
    expect(eventStartInstant("2026-08-31", "14:00").toISOString()).toBe("2026-08-31T12:00:00.000Z");
  });

  it("an all-day event starts at SAST midnight", () => {
    expect(eventStartInstant("2026-08-31", null).toISOString()).toBe("2026-08-30T22:00:00.000Z");
  });
});

describe("shouldSendReminderNow", () => {
  const due = new Date("2026-08-31T11:30:00.000Z"); // 13:30 SAST
  const start = new Date("2026-08-31T12:00:00.000Z"); // 14:00 SAST

  it("fires once due and before the event starts", () => {
    expect(
      shouldSendReminderNow({ dueInstant: due, eventStartInstant: start, now: due, alreadySent: false })
    ).toBe(true);
  });

  it("does not fire before it is due", () => {
    const before = new Date("2026-08-31T11:00:00.000Z");
    expect(
      shouldSendReminderNow({ dueInstant: due, eventStartInstant: start, now: before, alreadySent: false })
    ).toBe(false);
  });

  it("catches up a missed tick right up to the event start (inclusive)", () => {
    expect(
      shouldSendReminderNow({ dueInstant: due, eventStartInstant: start, now: start, alreadySent: false })
    ).toBe(true);
  });

  it("is too late once the event has started", () => {
    const after = new Date("2026-08-31T12:00:01.000Z");
    expect(
      shouldSendReminderNow({ dueInstant: due, eventStartInstant: start, now: after, alreadySent: false })
    ).toBe(false);
  });

  it("never fires an already-sent reminder", () => {
    expect(
      shouldSendReminderNow({ dueInstant: due, eventStartInstant: start, now: due, alreadySent: true })
    ).toBe(false);
  });

  it("never fires a null due instant", () => {
    expect(
      shouldSendReminderNow({ dueInstant: null, eventStartInstant: start, now: due, alreadySent: false })
    ).toBe(false);
  });

  it("skips reminders due before the catch-up floor (pre-cutover history)", () => {
    const floor = new Date("2026-08-31T11:45:00.000Z");
    expect(
      shouldSendReminderNow({
        dueInstant: due, // 11:30Z, before the floor
        eventStartInstant: start,
        now: start,
        alreadySent: false,
        notBefore: floor,
      })
    ).toBe(false);
  });
});
