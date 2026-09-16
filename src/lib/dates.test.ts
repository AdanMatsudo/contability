import { describe, expect, it } from "vitest";
import {
  addMonths,
  clampDay,
  currentMonth,
  daysInMonth,
  monthOf,
  monthRange,
  parseDmy,
  todayIso,
  daysAgoIso,
  isIsoDate,
  monthLabel,
} from "./dates";

describe("monthRange", () => {
  it("covers a 31-day month", () => {
    expect(monthRange("2026-09")).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(monthRange("2026-07")).toEqual({ from: "2026-07-01", to: "2026-07-31" });
  });

  it("handles leap years", () => {
    expect(monthRange("2028-02").to).toBe("2028-02-29");
    expect(monthRange("2026-02").to).toBe("2026-02-28");
  });
});

describe("daysInMonth", () => {
  it("returns the calendar length", () => {
    expect(daysInMonth("2026-04")).toBe(30);
    expect(daysInMonth("2028-02")).toBe(29);
  });
});

describe("addMonths", () => {
  it("moves forward and backward across year boundaries", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-09", -6)).toBe("2026-03");
  });
});

describe("todayIso / currentMonth in America/Sao_Paulo", () => {
  it("uses the Sao Paulo calendar day, not UTC", () => {
    // 2026-09-15 01:30 UTC is still 2026-09-14 22:30 in Sao Paulo (UTC-3).
    const now = new Date("2026-09-15T01:30:00Z");
    expect(todayIso(now)).toBe("2026-09-14");
    expect(currentMonth(now)).toBe("2026-09");
  });

  it("rolls the month at Sao Paulo midnight", () => {
    const now = new Date("2026-10-01T02:59:00Z");
    expect(todayIso(now)).toBe("2026-09-30");
    expect(currentMonth(now)).toBe("2026-09");
    expect(currentMonth(new Date("2026-10-01T03:00:00Z"))).toBe("2026-10");
  });
});

describe("parseDmy", () => {
  it("converts dd/mm/yyyy to ISO", () => {
    expect(parseDmy("05/09/2026")).toBe("2026-09-05");
  });

  it("rejects impossible dates", () => {
    expect(parseDmy("31/02/2026")).toBeNull();
    expect(parseDmy("2026-09-05")).toBeNull();
    expect(parseDmy("")).toBeNull();
  });
});

describe("monthOf / clampDay", () => {
  it("extracts the month from an ISO date", () => {
    expect(monthOf("2026-09-05")).toBe("2026-09");
  });

  it("clamps a day-of-month to the month length", () => {
    expect(clampDay("2026-02", 31)).toBe("2026-02-28");
    expect(clampDay("2026-09", 10)).toBe("2026-09-10");
  });
});

describe("daysAgoIso", () => {
  it("subtracts whole days on the Sao Paulo calendar", () => {
    // 2026-09-15T02:00Z is still 2026-09-14 in Sao Paulo.
    const now = new Date("2026-09-15T02:00:00Z");
    expect(daysAgoIso(0, now)).toBe("2026-09-14");
    expect(daysAgoIso(90, now)).toBe("2026-06-16");
    expect(daysAgoIso(14, now)).toBe("2026-08-31");
  });
});

describe("monthLabel / isIsoDate", () => {
  it("names the month in pt-BR, optionally with the year", () => {
    expect(monthLabel("2026-09")).toBe("setembro");
    expect(monthLabel("2026-01", true)).toBe("janeiro de 2026");
  });

  it("validates a real calendar date in ISO form", () => {
    expect(isIsoDate("2026-09-13")).toBe(true);
    expect(isIsoDate("2024-02-29")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("13/09/2026")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });
});
