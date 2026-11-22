import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import { getBurndown } from "./burndown";

// Wednesday noon
const now = DateTime.fromISO("2026-03-04T12:00:00").toMillis();
const at = (iso: string) => DateTime.fromISO(iso).toMillis();

// getBurndown(due, dueTime, complete, now, windowDays, warningDays)
const burndown = (
  due: string | null,
  dueTime: string | null = null,
  options: {
    complete?: boolean;
    now?: number;
    window?: number;
    warning?: number;
  } = {},
) =>
  getBurndown(
    due,
    dueTime,
    options.complete ?? false,
    options.now ?? now,
    options.window ?? 7,
    options.warning ?? 2,
  );

describe("getBurndown", () => {
  describe("no bar", () => {
    it("returns null without a due date", () => {
      expect(burndown(null)).toBeNull();
    });

    it("returns null for completed todos", () => {
      expect(burndown("2026-03-10", null, { complete: true })).toBeNull();
    });

    it("returns null for an invalid date", () => {
      expect(burndown("not-a-date")).toBeNull();
    });
  });

  describe("before the warning threshold", () => {
    it("is full when due is beyond the window", () => {
      expect(burndown("2026-03-30")).toEqual({ percent: 100, level: "normal" });
    });

    it("drains over the window in the normal color", () => {
      // end of 2026-03-07 is ~3.5 days away of a 7 day window
      expect(burndown("2026-03-07")).toEqual({
        percent: 50,
        level: "normal",
      });
    });

    it("scales with the configured window", () => {
      const week = burndown("2026-03-10", null, { window: 7 })!;
      const month = burndown("2026-03-10", null, { window: 30 })!;
      expect(month.percent).toBeLessThan(week.percent);
      expect(month.level).toBe("normal");
    });
  });

  describe("warning threshold", () => {
    it("just before the threshold the bar is still normal and small", () => {
      // 2 days and 1 minute left of a 7 day window
      const result = burndown("2026-03-06", "12:01")!;
      expect(result.level).toBe("normal");
      expect(result.percent).toBeCloseTo((2 / 7) * 100, 0);
    });

    it("at the threshold it jumps back to full in the warning color", () => {
      // exactly 2 days left
      expect(burndown("2026-03-06", "12:00")).toEqual({
        percent: 100,
        level: "warning",
      });
    });

    it("drains from full to the due time inside the threshold", () => {
      // 1 day of 2 left
      expect(burndown("2026-03-05", "12:00")).toEqual({
        percent: 50,
        level: "warning",
      });
      // 6 hours of 48 left
      expect(burndown("2026-03-04", "18:00")).toEqual({
        percent: 12.5,
        level: "warning",
      });
    });

    it("uses the configured number of days", () => {
      // 3 days left: normal with 2 days, warning with 4
      expect(burndown("2026-03-07", "12:00", { warning: 2 })!.level).toBe(
        "normal",
      );
      expect(burndown("2026-03-07", "12:00", { warning: 4 })).toEqual({
        percent: 75,
        level: "warning",
      });
    });

    it("never exceeds the window", () => {
      expect(burndown("2026-03-10", null, { window: 7, warning: 30 })).toEqual(
        burndown("2026-03-10", null, { window: 7, warning: 7 }),
      );
    });

    it("is at least 1 day", () => {
      expect(burndown("2026-03-05", "12:00", { warning: 0 })).toEqual(
        burndown("2026-03-05", "12:00", { warning: 1 }),
      );
    });

    it("with the threshold equal to the window there is no normal phase", () => {
      expect(
        burndown("2026-03-30", null, { window: 7, warning: 7 })!.level,
      ).toBe("normal");
      expect(
        burndown("2026-03-10", null, { window: 7, warning: 7 })!.level,
      ).toBe("warning");
    });
  });

  describe("draining to the exact time", () => {
    it("is nearly empty just before the due time", () => {
      const result = burndown("2026-03-04", "18:00", {
        now: at("2026-03-04T17:59:00"),
      })!;
      expect(result.level).toBe("warning");
      expect(result.percent).toBeCloseTo((1 / (2 * 24 * 60)) * 100, 1);
    });

    it("has less left than the same todo without a time", () => {
      const timed = burndown("2026-03-05", "08:00")!;
      const untimed = burndown("2026-03-05")!;
      expect(timed.percent).toBeLessThan(untimed.percent);
    });

    it("treats a todo without a time as due at the end of its day", () => {
      const result = burndown("2026-03-04", null, {
        now: at("2026-03-04T23:30:00"),
      })!;
      expect(result.level).toBe("warning");
      expect(result.percent).toBeLessThan(2);
    });

    it("falls back to the end of the day for an invalid time", () => {
      expect(burndown("2026-03-06", "nope")).toEqual(
        burndown("2026-03-06", null),
      );
    });

    it("has no minimum, so the bar really empties", () => {
      const result = burndown("2026-03-04", "18:00", {
        now: at("2026-03-04T17:59:59"),
      })!;
      expect(result.percent).toBeLessThan(1);
    });
  });

  describe("overdue", () => {
    it("is full and overdue after the due day", () => {
      expect(burndown("2026-03-03")).toEqual({
        percent: 100,
        level: "overdue",
      });
    });

    it("is overdue once the time has passed, even on the due day", () => {
      expect(burndown("2026-03-04", "09:00")).toEqual({
        percent: 100,
        level: "overdue",
      });
    });

    it("is not overdue just before the due time", () => {
      const result = burndown("2026-03-04", "18:00", {
        now: at("2026-03-04T17:59:00"),
      })!;
      expect(result.level).toBe("warning");
    });
  });
});
