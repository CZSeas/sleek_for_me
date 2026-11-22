import { describe, it, expect } from "vitest";
import { parseStoredDueTime, toStoredDueTime } from "./DueTime";

describe("parseStoredDueTime", () => {
  it.each([
    ["0000", "00:00"],
    ["0905", "09:05"],
    ["1430", "14:30"],
    ["2359", "23:59"],
  ])("parses %s as %s", (stored, expected) => {
    expect(parseStoredDueTime(stored)).toBe(expected);
  });

  it.each(["2400", "1260", "930", "14:30", "abcd", "", null, undefined])(
    "rejects %s",
    (value) => {
      expect(parseStoredDueTime(value as string | null | undefined)).toBeNull();
    },
  );
});

describe("toStoredDueTime", () => {
  it("converts HH:mm to HHmm", () => {
    expect(toStoredDueTime("14:30")).toBe("1430");
    expect(toStoredDueTime("09:05")).toBe("0905");
  });

  it.each(["24:00", "9:05", "1430", "", null, undefined])(
    "rejects %s",
    (value) => {
      expect(toStoredDueTime(value as string | null | undefined)).toBeNull();
    },
  );
});
