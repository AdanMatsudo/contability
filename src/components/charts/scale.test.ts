import { describe, expect, it } from "vitest";
import { linearScale, niceCeiling, ticks } from "./scale";

describe("linearScale", () => {
  it("maps the domain onto the range linearly", () => {
    const y = linearScale([0, 100], [200, 0]);
    expect(y(0)).toBe(200);
    expect(y(100)).toBe(0);
    expect(y(25)).toBe(150);
  });

  it("collapses a zero-width domain to the range start instead of dividing by zero", () => {
    const y = linearScale([0, 0], [200, 0]);
    expect(y(0)).toBe(200);
    expect(y(50)).toBe(200);
  });
});

describe("niceCeiling", () => {
  it("rounds up to 1, 2, 2.5 or 5 times a power of ten", () => {
    expect(niceCeiling(0)).toBe(1);
    expect(niceCeiling(7)).toBe(10);
    expect(niceCeiling(123)).toBe(200);
    expect(niceCeiling(230)).toBe(250);
    expect(niceCeiling(420000)).toBe(500000);
    expect(niceCeiling(1000)).toBe(1000);
  });
});

describe("ticks", () => {
  it("returns evenly spaced values from zero to the ceiling, inclusive", () => {
    expect(ticks(500000, 4)).toEqual([0, 125000, 250000, 375000, 500000]);
  });
});
