import { DateTime } from "luxon";

export type BurndownLevel = "normal" | "warning" | "overdue";

export interface Burndown {
  // Share of the window that is still left, 0-100
  percent: number;
  level: BurndownLevel;
}

// Below this share of the window the bar switches to the warning color
export const BURNDOWN_WARNING_THRESHOLD = 0.25;

const DAY_MS = 24 * 60 * 60 * 1000;

export const getBurndown = (
  due: string | null,
  complete: boolean,
  now: number,
  windowDays: number,
): Burndown | null => {
  if (!due || complete) return null;

  const target = DateTime.fromISO(due).endOf("day");
  if (!target.isValid) return null;

  const remainingMs = target.toMillis() - now;
  if (remainingMs < 0) return { percent: 100, level: "overdue" };

  const remaining = Math.min(remainingMs / (windowDays * DAY_MS), 1);
  return {
    percent: Math.round(remaining * 1000) / 10,
    level: remaining <= BURNDOWN_WARNING_THRESHOLD ? "warning" : "normal",
  };
};
