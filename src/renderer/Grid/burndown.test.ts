import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import { getBurndown } from "./burndown";

// Wednesday noon
const now = DateTime.fromISO("2026-03-04T12:00:00").toMillis();

describe("getBurndown", () => {
  it("returns null without a due date", () => {
    expect(getBurndown(null, false, now, 7)).toBeNull();
  });

  it("returns null for completed todos", () => {
    expect(getBurndown("2026-03-10", true, now, 7)).toBeNull();
  });

  it("returns null for an invalid date", () => {
    expect(getBurndown("not-a-date", false, now, 7)).toBeNull();
  });

  it("is full when due is beyond the window", () => {
    expect(getBurndown("2026-03-30", false, now, 7)).toEqual({
      percent: 100,
      level: "normal",
    });
  });

  it("is partial inside the window", () => {
    const result = getBurndown("2026-03-07", false, now, 7)!;
    expect(result.level).toBe("normal");
    expect(result.percent).toBeGreaterThan(25);
    expect(result.percent).toBeLessThan(100);
  });

  it("switches to warning at 25% or less", () => {
    // ~1.5 days left of a 7 day window (~21%)
    const result = getBurndown("2026-03-05", false, now, 7)!;
    expect(result.level).toBe("warning");
    expect(result.percent).toBeLessThanOrEqual(25);
  });

  it("is nearly empty at the end of the due day", () => {
    const lateNow = DateTime.fromISO("2026-03-04T23:30:00").toMillis();
    const result = getBurndown("2026-03-04", false, lateNow, 7)!;
    expect(result.level).toBe("warning");
    expect(result.percent).toBeLessThan(1);
  });

  it("is overdue after the due day", () => {
    expect(getBurndown("2026-03-03", false, now, 7)).toEqual({
      percent: 100,
      level: "overdue",
    });
  });

  it("scales with the configured window", () => {
    const week = getBurndown("2026-03-10", false, now, 7)!;
    const month = getBurndown("2026-03-10", false, now, 30)!;
    expect(month.percent).toBeLessThan(week.percent);
  });
});
