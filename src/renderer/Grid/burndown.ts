import { DateTime } from "luxon";

export type BurndownLevel = "normal" | "warning" | "overdue";

export interface Burndown {
  // Share of the window that is still left, 0-100
  percent: number;
  level: BurndownLevel;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const toPercent = (share: number): number =>
  Math.round(Math.min(share, 1) * 1000) / 10;

export const getBurndown = (
  due: string | null,
  dueTime: string | null,
  complete: boolean,
  now: number,
  windowDays: number,
  warningDays: number,
): Burndown | null => {
  if (!due || complete) return null;

  // Without a time the todo is due at the end of its due day
  const dueDay = DateTime.fromISO(due);
  if (!dueDay.isValid) return null;
  const time = dueTime ? DateTime.fromFormat(dueTime, "HH:mm") : null;
  const target = time?.isValid
    ? dueDay.set({ hour: time.hour, minute: time.minute }).startOf("minute")
    : dueDay.endOf("day");

  const remainingMs = target.toMillis() - now;
  if (remainingMs < 0) return { percent: 100, level: "overdue" };

  // The threshold is at least 1 day and never wider than the window
  const warningMs = Math.min(Math.max(warningDays, 1), windowDays) * DAY_MS;

  // Inside the threshold the bar jumps back to full in the warning color and
  // drains to the due time
  if (remainingMs <= warningMs) {
    return { percent: toPercent(remainingMs / warningMs), level: "warning" };
  }

  // Before that it drains over the whole window
  return {
    percent: toPercent(remainingMs / (windowDays * DAY_MS)),
    level: "normal",
  };
};
