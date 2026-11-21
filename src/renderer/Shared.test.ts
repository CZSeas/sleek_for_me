import { expect, describe, it, vi, afterEach } from "vitest";
import { DateTime, Settings as LuxonSettings, WeekdayNumbers } from "luxon";
import { attributeDisplayValue, friendlyDate } from "./Shared";
import { SettingStore } from "@sleek-types";
import { i18n } from "./Settings/LanguageSelector";

// Mock translation function
// @ts-expect-error We're not gonna get into this...
const mockT: typeof i18n.t = (key) => {
  return key;
};

// @ts-expect-error Ignore this until we have a default SettingStore to test with.
const mockSettings: SettingStore = {
  language: "en",
  weekStart: 1, // Monday
};

describe("attributeDisplayValue", () => {
  it.each(["projects", "contexts"] as const)(
    "shows only the Markdown label for %s values",
    (attributeKey) => {
      expect(
        attributeDisplayValue(
          "[Roadmap](https://example.com/roadmap)",
          attributeKey,
        ),
      ).toBe("Roadmap");
    },
  );

  it("leaves other attribute values unchanged", () => {
    const value = "[2026-10-16](https://example.com/date)";
    expect(attributeDisplayValue(value, "due")).toBe(value);
  });

  it("leaves plain and malformed values unchanged", () => {
    expect(attributeDisplayValue("Roadmap", "projects")).toBe("Roadmap");
    expect(attributeDisplayValue("[Roadmap](", "contexts")).toBe("[Roadmap](");
  });

  it("preserves nested brackets in a Markdown link label", () => {
    expect(
      attributeDisplayValue(
        "[Team[Ops]](https://example.com/team-ops)",
        "projects",
      ),
    ).toBe("Team[Ops]");
  });

  it("preserves parentheses in a Markdown link destination", () => {
    expect(
      attributeDisplayValue(
        "[Roadmap](https://example.com/roadmap_(2026))",
        "projects",
      ),
    ).toBe("Roadmap");
  });
});

describe("friendlyDate", () => {
  // Helper to get dates relative to today
  const getRelativeDate = (daysOffset: number): string => {
    return DateTime.now()
      .plus({ days: daysOffset })
      .startOf("day")
      .toISODate()!;
  };

  describe("Past dates", () => {
    it("should return 'Yesterday' for 1 day ago", () => {
      const yesterday = getRelativeDate(-1);
      const result = friendlyDate(yesterday, "due", mockSettings, mockT);
      expect(result).toContain("drawer.attributes.yesterday");
    });

    it("should return 'Overdue' for dates more than 1 day in the past", () => {
      const twoDaysAgo = getRelativeDate(-2);
      const result = friendlyDate(twoDaysAgo, "due", mockSettings, mockT);
      expect(result).toContain("drawer.attributes.overdue");
    });

    it("should return 'Elapsed' for threshold dates in the past", () => {
      const twoDaysAgo = getRelativeDate(-2);
      const result = friendlyDate(twoDaysAgo, "t", mockSettings, mockT);
      expect(result).toContain("drawer.attributes.elapsed");
    });
  });

  describe("Today and Tomorrow", () => {
    it("should return 'Today' for today", () => {
      const today_str = getRelativeDate(0);
      const result = friendlyDate(today_str, "due", mockSettings, mockT);
      expect(result).toContain("drawer.attributes.today");
      expect(result.length).toBe(1);
    });

    it("should return 'Tomorrow' for tomorrow", () => {
      const tomorrow = getRelativeDate(1);
      const result = friendlyDate(tomorrow, "due", mockSettings, mockT);
      expect(result).toContain("drawer.attributes.tomorrow");
      expect(result.length).toBe(1);
    });
  });

  describe("This week (rest of current calendar week)", () => {
    it("should return 'This week' for dates within current calendar week", () => {
      // Get a date that is in the current week but not today or tomorrow
      LuxonSettings.defaultWeekSettings = {
        firstDay: 1 as WeekdayNumbers,
        minimalDays: 4,
        weekend: [6, 7],
      };
      const now = DateTime.now().startOf("day");
      const endOfThisWeek = now.endOf("week", { useLocaleWeeks: true });
      const daysUntilEndOfWeek = endOfThisWeek.diff(now, "days").days;

      // If there are at least 3 days left in the week, test a middle date
      if (daysUntilEndOfWeek >= 3) {
        const dateInThisWeek = getRelativeDate(2);
        const result = friendlyDate(dateInThisWeek, "due", mockSettings, mockT);
        expect(result).toContain("drawer.attributes.thisWeek");
      }
    });
  });

  describe("Next week", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    // 2026-03-04 is a Wednesday; with a Monday week start:
    // this week = Mar 2-8, next week = Mar 9-15
    const freeze = () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 2, 4, 12, 0, 0));
    };

    it.each(["2026-03-09", "2026-03-12", "2026-03-15"])(
      "should return 'Next week' for %s",
      (date) => {
        freeze();
        const result = friendlyDate(date, "due", mockSettings, mockT);
        expect(result).toEqual(["drawer.attributes.nextWeek"]);
      },
    );

    it("should keep the end of this week as 'This week'", () => {
      freeze();
      const result = friendlyDate("2026-03-08", "due", mockSettings, mockT);
      expect(result).toEqual(["drawer.attributes.thisWeek"]);
    });

    it("should return 'Next week' even when next week crosses into next month", () => {
      // Wed 2026-03-25: next week = Mar 30 - Apr 5
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 2, 25, 12, 0, 0));
      const result = friendlyDate("2026-04-02", "due", mockSettings, mockT);
      expect(result).toEqual(["drawer.attributes.nextWeek"]);
    });

    it("should not return 'Next week' for the week after next", () => {
      freeze();
      const result = friendlyDate("2026-03-16", "due", mockSettings, mockT);
      expect(result).toEqual(["drawer.attributes.thisMonth"]);
    });
  });

  describe("This month (rest of current month, after next week)", () => {
    it("should return 'This month' for dates in current month but beyond next week", () => {
      LuxonSettings.defaultWeekSettings = {
        firstDay: 1 as WeekdayNumbers,
        minimalDays: 4,
        weekend: [6, 7],
      };
      const now = DateTime.now().startOf("day");
      const endOfNextWeek = now
        .plus({ weeks: 1 })
        .endOf("week", { useLocaleWeeks: true });
      const endOfThisMonth = now.endOf("month");

      const daysUntilEndOfNextWeek = Math.ceil(
        endOfNextWeek.diff(now, "days").days,
      );
      const daysUntilEndOfMonth = Math.floor(
        endOfThisMonth.diff(now, "days").days,
      );

      // Only test if there's room between next week and the end of the month
      if (daysUntilEndOfNextWeek < daysUntilEndOfMonth) {
        const dateInThisMonth = getRelativeDate(daysUntilEndOfNextWeek);
        const result = friendlyDate(
          dateInThisMonth,
          "due",
          mockSettings,
          mockT,
        );
        expect(result).toContain("drawer.attributes.thisMonth");
        expect(result).not.toContain("drawer.attributes.nextWeek");
      }
    });
  });

  describe("Next month", () => {
    it("should return 'Next month' for dates in the following month", () => {
      LuxonSettings.defaultWeekSettings = {
        firstDay: 1 as WeekdayNumbers,
        minimalDays: 4,
        weekend: [6, 7],
      };
      const now = DateTime.now().startOf("day");
      const endOfNextWeek = now
        .plus({ weeks: 1 })
        .endOf("week", { useLocaleWeeks: true });
      const daysUntilEndOfMonth = Math.ceil(
        now.endOf("month").diff(now, "days").days,
      );
      // First day of next month, pushed past next week if necessary
      const dateObj = DateTime.fromISO(
        getRelativeDate(daysUntilEndOfMonth + 1),
      );
      const candidate =
        dateObj <= endOfNextWeek ? endOfNextWeek.plus({ days: 1 }) : dateObj;

      // Only test if the date is actually in the following month
      if (candidate <= now.plus({ months: 1 }).endOf("month")) {
        const result = friendlyDate(
          candidate.toISODate()!,
          "due",
          mockSettings,
          mockT,
        );
        expect(result).toContain("drawer.attributes.nextMonth");
      }
    });
  });

  describe("Far future (date string)", () => {
    it("should return date string for dates far in the future", () => {
      const farFuture = getRelativeDate(100); // 100+ days away
      const result = friendlyDate(farFuture, "due", mockSettings, mockT);
      // Should be a date string matching YYYY-MM-DD format
      expect(result[0]).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  describe("Result structure", () => {
    it("should return array with single item for all dates", () => {
      const tomorrow = getRelativeDate(1);
      const result = friendlyDate(tomorrow, "due", mockSettings, mockT);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
    });

    it("should return array with 'Today' label only", () => {
      const today_str = getRelativeDate(0);
      const result = friendlyDate(today_str, "due", mockSettings, mockT);
      expect(result.length).toBe(1);
      expect(result[0]).toBe("drawer.attributes.today");
    });
  });

  describe("Attribute type handling", () => {
    it("should use 'Overdue' for due dates in the past", () => {
      const twoDaysAgo = getRelativeDate(-2);
      const result = friendlyDate(twoDaysAgo, "due", mockSettings, mockT);
      expect(result).toContain("drawer.attributes.overdue");
    });

    it("should use 'Elapsed' for threshold dates in the past", () => {
      const twoDaysAgo = getRelativeDate(-2);
      const result = friendlyDate(twoDaysAgo, "t", mockSettings, mockT);
      expect(result).toContain("drawer.attributes.elapsed");
    });
  });
});
