import { describe, it, expect } from "vitest";
import { appWallClockToInstant, nowInAppTz } from "./app-timezone";

describe("nowInAppTz", () => {
  it("renders a UTC instant as the SAST wall clock (+2)", () => {
    expect(nowInAppTz(new Date("2026-08-31T11:30:00.000Z"))).toEqual({
      date: "2026-08-31",
      time: "13:30",
    });
  });

  it("crosses midnight into the next SAST day", () => {
    // 22:30Z is 00:30 the next day in SAST.
    expect(nowInAppTz(new Date("2026-08-31T22:30:00.000Z"))).toEqual({
      date: "2026-09-01",
      time: "00:30",
    });
  });

  it("emits midnight as 00:00, not 24:00", () => {
    expect(nowInAppTz(new Date("2026-08-31T22:00:00.000Z"))).toEqual({
      date: "2026-09-01",
      time: "00:00",
    });
  });
});

describe("appWallClockToInstant", () => {
  it("treats the wall clock as SAST and returns the UTC instant", () => {
    expect(appWallClockToInstant("2026-08-31", "13:30").toISOString()).toBe(
      "2026-08-31T11:30:00.000Z"
    );
  });
});
